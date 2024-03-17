import React from 'react';
import { useWebSocket } from './WebSocketContext';

const Recording: React.FC = () => {
    const { recordingUrl } = useWebSocket();
    return (
        <a href={recordingUrl} target="_blank" rel="noreferrer">
            {recordingUrl.split('/').pop()}
        </a>
    );
};

export default Recording;
