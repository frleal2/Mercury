import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const POLL_INTERVAL_MS = 60_000;

export function useNotifications() {
  const { session, refreshAccessToken } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session.accessToken}`,
  }), [session.accessToken]);

  const fetchUnreadCount = useCallback(async () => {
    if (!session.accessToken) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/notifications/unread-count/`, {
        headers: authHeaders(),
      });
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshAccessToken();
      }
      // Silently ignore poll errors — badge may be stale but UI is unaffected
    }
  }, [session.accessToken, authHeaders, refreshAccessToken]);

  const fetchNotifications = useCallback(async (category = null) => {
    if (!session.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (category) params.category = category;
      const res = await axios.get(`${BASE_URL}/api/notifications/`, {
        headers: authHeaders(),
        params,
      });
      const results = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
      setNotifications(results);
    } catch (err) {
      if (err.response?.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) return fetchNotifications(category);
      }
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [session.accessToken, authHeaders, refreshAccessToken]);

  const markRead = useCallback(async (id) => {
    try {
      await axios.patch(
        `${BASE_URL}/api/notifications/${id}/mark-read/`,
        {},
        { headers: authHeaders() }
      );
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Stale read state is acceptable
    }
  }, [authHeaders]);

  const markAllRead = useCallback(async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/notifications/mark-all-read/`,
        {},
        { headers: authHeaders() }
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // No-op
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}
