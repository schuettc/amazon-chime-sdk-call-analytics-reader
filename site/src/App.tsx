import React from 'react';
import Transcription from './Transcription';
import Messages from './Messages';
import SentimentChart from './Sentiment';
// import Summarization from './Summarization';
import Status from './Status';
import Recording from './Recording';
import { ContentLayout, Header, SpaceBetween, AppLayout, Tabs } from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';

import { useWebSocket } from './WebSocketContext';

const App: React.FC = () => {
    const { recordingUrl, messages, sentiments, summarization, transcriptions, currentLine } = useWebSocket();

    return (
        <AppLayout
            content={
                <ContentLayout header={<Header variant="h1">Amazon Chime SDK Call Analytics</Header>}>
                    <SpaceBetween size="xl">
                        <Status />
                        <Tabs
                            tabs={[
                                {
                                    label: 'Messages',
                                    id: 'Messages',
                                    content: <Messages />,
                                    disabled: messages.length === 0,
                                },
                                {
                                    label: 'Transcriptions',
                                    id: 'Transcriptions',
                                    content: <Transcription />,
                                    disabled: transcriptions.length === 0 && currentLine.length === 0,
                                },
                                {
                                    label: 'Sentiment',
                                    id: 'Sentiment',
                                    content: <SentimentChart />,
                                    disabled: sentiments.length === 0,
                                },
                                {
                                    label: 'Recording',
                                    id: 'Recording',
                                    content: <Recording />,
                                    disabled: recordingUrl.length === 0,
                                },
                                // {
                                //     label: 'Summarization',
                                //     id: 'Summarization',
                                //     content: <Summarization />,
                                //     disabled: summarization.length === 0,
                                // },
                            ]}
                            variant="container"
                        />
                    </SpaceBetween>
                </ContentLayout>
            }
            navigationHide={true}
            toolsHide={true}
        />
    );
};

export default App;
