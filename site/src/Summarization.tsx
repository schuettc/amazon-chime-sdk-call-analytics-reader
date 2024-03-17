import React from 'react';
import { useWebSocket } from './WebSocketContext';

const Summarization: React.FC = () => {
    const { summarization } = useWebSocket();
    return <div>{summarization}</div>;
};

export default Summarization;
