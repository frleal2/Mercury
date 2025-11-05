import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import BASE_URL from '../config';

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

  const logout = useCallback(() => {
    setSession({ accessToken: '', refreshToken: '' });
    localStorage.removeItem('session');
    // Use window.location to redirect to login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (!session.refreshToken) {
      console.log('No refresh token available');
      logout();
      return null;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: session.refreshToken }),
      });

      if (!response.ok) {
        console.log('Refresh token failed, logging out');
        logout();
        return null;
      }

      const data = await response.json();
      const updatedSession = { ...session, accessToken: data.access };
      setSession(updatedSession);
      console.log('Access token refreshed successfully');
      return data.access;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      // Any refresh failure should result in logout and redirect
      logout();
      return null;
    }
  }, [session.refreshToken, logout]);

  // Activity tracking
  const activityTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Set timeout for 30 minutes of inactivity before warning user
    activityTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // If truly inactive for 30 minutes, show warning
      if (timeSinceLastActivity >= 30 * 60 * 1000) {
        const shouldStayLoggedIn = window.confirm(
          'Your session will expire soon due to inactivity. Do you want to stay logged in?'
        );
        
        if (shouldStayLoggedIn) {
          refreshAccessToken();
          resetActivityTimer(); // Reset timer
        } else {
          logout();
        }
      }
    }, 30 * 60 * 1000); // 30 minutes
  }, [refreshAccessToken, logout]);

  // Proactive token refresh - refresh token before it expires
  const tokenRefreshIntervalRef = useRef(null);

  const startTokenRefreshInterval = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }

    // Refresh token every 14 minutes (assuming 15-minute token expiry)
    tokenRefreshIntervalRef.current = setInterval(() => {
      if (session.accessToken) {
        console.log('Proactively refreshing access token');
        refreshAccessToken();
      }
    }, 14 * 60 * 1000); // 14 minutes
  }, [session.accessToken, refreshAccessToken]);

  // Activity listeners
  useEffect(() => {
    if (!session.accessToken) return;

    const handleUserActivity = (e) => {
      // Only reset on meaningful activity (not just mouse hover)
      if (e.type === 'mousemove') {
        // Throttle mousemove events
        const now = Date.now();
        if (now - lastActivityRef.current < 5000) return; // 5 second throttle
      }
      resetActivityTimer();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, true);
    });

    // Also listen for less frequent mousemove
    window.addEventListener('mousemove', handleUserActivity);

    resetActivityTimer(); // Initialize timer

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity, true);
      });
      window.removeEventListener('mousemove', handleUserActivity);
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [session.accessToken, resetActivityTimer]);

  // Token refresh interval
  useEffect(() => {
    if (session.accessToken) {
      startTokenRefreshInterval();
    } else {
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    }

    return () => {
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, [session.accessToken, startTokenRefreshInterval]);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        setSessionState(parsedSession);
      } catch (error) {
        console.error('Error parsing saved session:', error);
        localStorage.removeItem('session');
      }
    }
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession, refreshAccessToken, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
