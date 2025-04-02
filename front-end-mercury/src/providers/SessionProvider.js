import React, { createContext, useContext, useState } from 'react';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
    const [session, setSession] = useState({
        accessToken: localStorage.getItem('accessToken') || null,
        refreshToken: localStorage.getItem('refreshToken') || null,
    });

    const updateSession = (newSession) => {
        if (newSession.accessToken) {
            localStorage.setItem('accessToken', newSession.accessToken);
        } else {
            localStorage.removeItem('accessToken');
        }

        if (newSession.refreshToken) {
            localStorage.setItem('refreshToken', newSession.refreshToken);
        } else {
            localStorage.removeItem('refreshToken');
        }

        setSession(newSession);
    };

    return (
        <SessionContext.Provider value={{ session, setSession: updateSession }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => useContext(SessionContext);
