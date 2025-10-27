import React, { createContext, useState, useCallback, useContext } from 'react';

export const LogContext = createContext();

export const useLogger = () => {
    return useContext(LogContext);
};

const formatTime = (date) => {
    return date.toTimeString().split(' ')[0];
};

export const LogProvider = ({ children }) => {
    const [logs, setLogs] = useState([]);

    const addLog = useCallback((message, type = 'INFO') => {
        const timestamp = formatTime(new Date());
        const newLog = `${timestamp} [${type}] - ${message}`;
        setLogs(prevLogs => [...prevLogs, newLog]); // Append to the end
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const logValue = {
        logs,
        addLog,
        clearLogs,
    };

    return (
        <LogContext.Provider value={logValue}>
            {children}
        </LogContext.Provider>
    );
};