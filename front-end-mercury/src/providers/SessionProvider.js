import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

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

  const refreshAccessToken = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: session.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json();
      const updatedSession = { ...session, accessToken: data.access };
      setSession(updatedSession); // Update session with new access token
      return data.access;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      setSession({ accessToken: '', refreshToken: '' }); // Clear session on failure
      return null;
    }
  };

  const activityTimeoutRef = useRef(null);

  const resetActivityTimer = () => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    activityTimeoutRef.current = setTimeout(() => {
      refreshAccessToken(); // Refresh token when timer expires
    }, 5 * 60 * 1000); // 5 minutes of inactivity
  };

  useEffect(() => {
    const handleUserActivity = () => resetActivityTimer();

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    resetActivityTimer(); // Initialize timer on mount

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      setSessionState(JSON.parse(savedSession));
    }
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession, refreshAccessToken }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
