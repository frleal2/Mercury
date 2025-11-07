import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import BASE_URL from '../config';
import { jwtDecode } from 'jwt-decode';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSessionState] = useState(() => {
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      // If there's an access token but no userInfo, decode it
      if (parsed.accessToken && !parsed.userInfo) {
        try {
          const decoded = jwtDecode(parsed.accessToken);
          parsed.userInfo = {
            userId: decoded.user_id,
            username: decoded.username,
            tenantId: decoded.tenant_id,
            tenantName: decoded.tenant_name,
            companies: decoded.companies || [],
            isCompanyAdmin: decoded.is_company_admin || false,
            exp: decoded.exp
          };
        } catch (error) {
          console.error('Error decoding existing JWT token:', error);
        }
      }
      return parsed;
    }
    return { accessToken: '', refreshToken: '' };
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const failedQueue = useRef([]);

  const setSession = (newSession) => {
    // If there's an access token, decode it and add user info
    if (newSession.accessToken) {
      try {
        const decoded = jwtDecode(newSession.accessToken);
        newSession.userInfo = {
          userId: decoded.user_id,
          username: decoded.username,
          tenantId: decoded.tenant_id,
          tenantName: decoded.tenant_name,
          tenantDomain: decoded.tenant_domain,
          companies: decoded.companies || [],
          isCompanyAdmin: decoded.is_company_admin || false,
          exp: decoded.exp
        };
      } catch (error) {
        console.error('Error decoding JWT token:', error);
      }
    }
    
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
    if (isRefreshing) {
      // If already refreshing, wait for it
      return new Promise((resolve, reject) => {
        failedQueue.current.push({ resolve, reject });
      });
    }

    const currentSession = JSON.parse(localStorage.getItem('session') || '{}');
    
    console.log('🔄 Refresh token attempt - Current session:', {
      hasAccessToken: !!currentSession.accessToken,
      hasRefreshToken: !!currentSession.refreshToken,
      timestamp: new Date().toISOString()
    });
    
    if (!currentSession.refreshToken) {
      console.log('❌ No refresh token available - logging out');
      logout();
      return null;
    }

    setIsRefreshing(true);

    try {
      console.log('📡 Calling refresh token API...');
      const response = await fetch(`${BASE_URL}/api/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: currentSession.refreshToken }),
      });

      console.log('📡 Refresh API response status:', response.status);

      if (!response.ok) {
        console.log('❌ Refresh token failed with status:', response.status);
        if (response.status === 401) {
          // Only logout on 401 (token expired), not on network errors
          console.log('🔐 Refresh token expired - logging out');
          logout();
        } else {
          console.log('⚠️ Non-401 error during refresh - not logging out');
        }
        
        // Process failed queue
        failedQueue.current.forEach(({ reject }) => {
          reject(new Error('Token refresh failed'));
        });
        failedQueue.current = [];
        
        return null;
      }

      const data = await response.json();
      const updatedSession = { ...currentSession, accessToken: data.access };
      setSession(updatedSession);
      
      // Process failed queue with new token
      failedQueue.current.forEach(({ resolve }) => {
        resolve(data.access);
      });
      failedQueue.current = [];
      
      console.log('✅ Access token refreshed successfully');
      return data.access;
    } catch (error) {
      console.error('💥 Error refreshing access token:', error);
      
      // Process failed queue
      failedQueue.current.forEach(({ reject }) => {
        reject(error);
      });
      failedQueue.current = [];
      
      // Don't logout on network errors, only on authentication failures
      console.log('⚠️ Network error during refresh - not logging out, will retry later');
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [logout, isRefreshing]);

  // Activity tracking
  const activityTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true);

  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    isActiveRef.current = true;
    
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Set timeout for 30 minutes of inactivity before warning user
    activityTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // If truly inactive for 30 minutes, show warning
      if (timeSinceLastActivity >= 30 * 60 * 1000) {
        isActiveRef.current = false;
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

    // Refresh token every 12 minutes (more conservative, assuming 15-minute token expiry)
    tokenRefreshIntervalRef.current = setInterval(() => {
      const currentSession = JSON.parse(localStorage.getItem('session') || '{}');
      if (currentSession.accessToken) {
        console.log('⏰ Proactive refresh triggered (12min interval)');
        refreshAccessToken();
      } else {
        console.log('⏰ Proactive refresh skipped - no access token');
      }
    }, 12 * 60 * 1000); // 12 minutes (was 14)
  }, [refreshAccessToken]);

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

  // Set up axios interceptor for automatic token refresh
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentSession = JSON.parse(localStorage.getItem('session') || '{}');
        if (currentSession.accessToken) {
          config.headers.Authorization = `Bearer ${currentSession.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            console.log('🔄 401 detected, attempting token refresh...');
            const newToken = await refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              console.log('🔄 Retrying original request with new token');
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('🔄 Token refresh failed in interceptor:', refreshError);
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshAccessToken]);

  return (
    <SessionContext.Provider value={{ session, setSession, refreshAccessToken, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
