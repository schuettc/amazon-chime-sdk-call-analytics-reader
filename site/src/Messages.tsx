import React, { useState, useCallback } from 'react';
import { Multiselect, MultiselectProps } from '@cloudscape-design/components';
import { Message } from './Types';
import { useWebSocket } from './WebSocketContext';

const MESSAGE_OPTIONS: MultiselectProps.Option[] = [
    { label: 'Transcribe', value: 'Transcribe', iconName: 'microphone' },
    {
        label: 'Voice Tone Analysis',
        value: 'VoiceToneAnalysisStatus',
        iconName: 'microphone',
    },
    { label: 'Recording', value: 'Recording', iconName: 'file' },
    // {
    //     label: 'Summarization',
    //     value: 'Summarization',
    //     iconName: 'file',
    // },
    {
        label: 'Voice Analytics Status',
        value: 'VoiceAnalyticsStatus',
        iconName: 'notification',
    },
    {
        label: 'Chime VoiceConnector Streaming Status',
        value: 'Chime VoiceConnector Streaming Status',
        iconName: 'notification',
    },
    {
        label: 'Media Insights State Change',
        value: 'Media Insights State Change',
        iconName: 'notification',
    },
    {
        label: 'CallAnalyticsMetadata',
        value: 'CallAnalyticsMetadata',
        iconName: 'notification',
    },
];

const MessageFormatter = ({ message }: { message: Message }) => {
    const formatMessage = useCallback((message: Message) => {
        let formattedMessage = '';
        for (const key in message) {
            if (message.hasOwnProperty(key)) {
                const value = message[key];
                formattedMessage += `${key}: ${JSON.stringify(value, null, 2)}\n`;
            }
        }
        return formattedMessage;
    }, []);

    return <pre>{formatMessage(message)}</pre>;
};

const Messages: React.FC = () => {
    const { messages } = useWebSocket();
    const [selectedOptions, setSelectedOptions] = useState<any>([]);

    const filterMessages = (message: Message) => {
        return (
            selectedOptions.length === 0 ||
            selectedOptions.some(
                (option: MultiselectProps.Option) =>
                    option.value?.toLowerCase() === message['detail-type'].toLowerCase(),
            )
        );
    };

    const filteredMessages = messages.filter(filterMessages);

    return (
        <div>
            <Multiselect
                selectedOptions={selectedOptions}
                onChange={(event) => setSelectedOptions(event.detail.selectedOptions)}
                options={MESSAGE_OPTIONS}
                filteringType="auto"
                placeholder="Choose event types to filter"
            />
            <ul className="message-list">
                {filteredMessages.map((message, index) => (
                    <li key={index} className="message">
                        <MessageFormatter message={message} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Messages;
