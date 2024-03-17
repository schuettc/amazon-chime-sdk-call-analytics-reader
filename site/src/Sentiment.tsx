import React, { useState, useEffect } from 'react';
import LineChart from '@cloudscape-design/components/line-chart';
import { useWebSocket } from './WebSocketContext';

interface ChartData {
    x: Date;
    y: number;
}
interface Sentiment {
    currentAverageVoiceTone: {
        startTime: string;
        endTime: string;
        voiceToneScore: {
            positive: number;
            negative: number;
            neutral: number;
        };
        voiceToneLabel: 'positive' | 'negative' | 'neutral';
    };
}

const SentimentChart: React.FC = () => {
    const { sentiments } = useWebSocket();
    const currentTime = new Date().getTime();
    const startTime = currentTime - 5 * 60000; // 1 minute in milliseconds
    const endTime = currentTime;
    const xDomain: [Date, Date] = [new Date(startTime), new Date(endTime)];
    const [customerData, setCustomerData] = useState<ChartData[]>([]);
    const [agentData, setAgentData] = useState<ChartData[]>([]);

    const mergeSentimentValues = (sentiment: Sentiment) => {
        const { positive, negative, neutral } = sentiment.currentAverageVoiceTone.voiceToneScore;
        const mergedScore = positive * 1.5 + negative * -1.5 + neutral * 0;
        return mergedScore;
    };

    useEffect(() => {
        if (sentiments.length > 0) {
            const sentiment = sentiments[sentiments.length - 1]; // Get the last sentiment
            const voiceToneScore = sentiment.detail.voiceToneAnalysisDetails;
            const mergedValue = mergeSentimentValues(voiceToneScore);

            const chartData = {
                x: new Date(sentiment.detail.voiceToneAnalysisDetails.currentAverageVoiceTone.endTime),
                y: mergedValue,
            };

            if (sentiment.detail.isCaller) {
                console.info('Got Agent Sentiment Data: ', sentiment.detail);
                setAgentData((agentData) => [...agentData, chartData]);
            } else {
                console.info('Got Customer Sentiment Data: ', sentiment.detail);
                setCustomerData((customerData) => [...customerData, chartData]);
            }
        }
    }, [sentiments]);

    // console.log(chartData);
    return (
        <LineChart
            series={[
                { title: 'Customer', data: customerData, type: 'line' },
                { title: 'Agent', data: agentData, type: 'line' },
            ]}
            xDomain={xDomain}
            yDomain={[-1, 1]} // Adjust the y-axis range as needed
            ariaLabel="Sentiment Line Chart"
            i18nStrings={{
                filterLabel: 'Filter displayed data',
                filterPlaceholder: 'Filter data',
                filterSelectedAriaLabel: 'selected',
                detailPopoverDismissAriaLabel: 'Dismiss',
                legendAriaLabel: 'Legend',
                chartAriaRoleDescription: 'line chart',
                xTickFormatter: (e) =>
                    e
                        .toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            second: 'numeric',
                            hour12: false,
                        })
                        .split(',')
                        .join('\n'),
            }}
            errorText="Error loading data."
            height={300}
            hideFilter
            loadingText="Loading chart"
            recoveryText="Retry"
            xScaleType="time"
            xTitle="Time"
            yTitle="Sentiment Value"
        />
    );
};

const MemoizedSentimentChart = React.memo(SentimentChart);
export default MemoizedSentimentChart;
