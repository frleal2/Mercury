import React, { createContext, useContext, useState, useEffect } from 'react';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSessionState] = useState(() => {
    const savedSession = localStorage.getItem('session');
    return savedSession ? JSON.parse(savedSession) : { accessToken: '', refreshToken: '' };
  });

  const setSession = (newSession) => {
    setSessionState(newSession);
    localStorage.setItem('session', JSON.stringify(newSession));
  };

  useEffect(() => {
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      setSessionState(JSON.parse(savedSession));
    }
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
