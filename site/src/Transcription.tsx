import React, { useCallback } from 'react';
import { Message } from './Types';
import { useWebSocket } from './WebSocketContext';
import { Button, Header, Popover, StatusIndicator } from '@cloudscape-design/components';

const Transcription: React.FC = () => {
    const { transcriptions, currentLine } = useWebSocket();

    const formatTranscriptMessage = useCallback((message: Message) => {
        const { time, TranscriptEvent } = message;
        const speaker = TranscriptEvent.ChannelId === 'ch_0' ? 'Agent' : 'Customer';
        const transcript = TranscriptEvent.Alternatives[0].Transcript;
        return `[${speaker}] ${transcript}`;
    }, []);

    const buildCompleteTranscription = () => {
        return transcriptions.map(formatTranscriptMessage).join('\n');
    };

    const copyTranscriptionToClipboard = () => {
        const transcriptionText = buildCompleteTranscription();
        navigator.clipboard.writeText(transcriptionText);
    };

    const TranscriptionItem = React.memo(({ transcription }: { transcription: Message }) => (
        <div>{formatTranscriptMessage(transcription)}</div>
    ));

    const CurrentLine = React.memo(({ phrase }: { phrase: Message }) => <div>{formatTranscriptMessage(phrase)}</div>);

    return (
        <div>
            <Header
                variant="h3"
                actions={
                    <Popover
                        size="small"
                        position="left"
                        triggerType="custom"
                        dismissButton={false}
                        content={<StatusIndicator type="success">Transcription Copied</StatusIndicator>}
                    >
                        <Button iconName="copy" onClick={copyTranscriptionToClipboard}>
                            Copy
                        </Button>
                    </Popover>
                }
            ></Header>

            <ul className="transcription-list">
                {transcriptions.map((transcription, index) => (
                    <li key={index} className="transcription-item">
                        <TranscriptionItem transcription={transcription} />
                    </li>
                ))}
            </ul>
            <ul className="current-line">
                {currentLine.map((phrase, index) => (
                    <li key={index} className="current-line">
                        <CurrentLine phrase={phrase} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Transcription;
