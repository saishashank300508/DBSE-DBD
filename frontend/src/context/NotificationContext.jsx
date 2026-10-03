import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { trackingApi } from '../api/axios';
import { useAuth } from './AuthContext';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stompClient, setStompClient] = useState(null);
  const [popup, setPopup] = useState(null); // Real-time popup to show

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await trackingApi.get('/notifications');
      const list = Array.isArray(data) ? data.map(n => ({
        ...n,
        isRead: n.isRead !== undefined ? n.isRead : (n.read !== undefined ? n.read : false)
      })) : [];
      setNotifications(list);

      const countRes = await trackingApi.get('/notifications/unread/count');
      setUnreadCount(typeof countRes.data === 'number' ? countRes.data : list.filter(n => !n.isRead).length);
    } catch (e) {
      console.warn("Could not fetch notifications:", e.message);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (user) {
      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8083/ws';
      let client = null;
      try {
        client = Stomp.over(() => new SockJS(wsUrl));
        client.debug = () => {}; // Disable debug logs

        client.connect({}, () => {
          setStompClient(client);

          const handleIncomingNotification = (msg) => {
            try {
              const newNotif = JSON.parse(msg.body);
              const formatted = {
                ...newNotif,
                isRead: false
              };
              setNotifications(prev => [formatted, ...prev.filter(n => n.id !== formatted.id)]);
              setUnreadCount(prev => prev + 1);
              setPopup(formatted);
            } catch (err) {
              console.error("Error parsing notification:", err);
            }
          };

          // 1. Subscribe to personal user notification topic (for Donor, NGO, Volunteer)
          client.subscribe(`/topic/user/${user.id}/notifications`, handleIncomingNotification);

          // 2. Also subscribe to /topic/ngo/{id}/notifications for backward compatibility
          client.subscribe(`/topic/ngo/${user.id}/notifications`, handleIncomingNotification);

          // 3. If volunteer, also listen to volunteer assignments topic
          if (user.role === 'VOLUNTEER' && user.profileId) {
            client.subscribe(`/topic/volunteer/${user.profileId}/assignments`, () => {
              fetchNotifications();
            });
          }

          // 4. Global donation events (triggers unread fetch)
          client.subscribe('/topic/donations', () => {
            fetchNotifications();
          });

        }, (error) => {
          console.warn("WebSocket connection error:", error);
        });
      } catch (err) {
        console.warn("SockJS initialization failed:", err);
      }

      return () => {
        if (client) {
          try {
            client.disconnect();
          } catch (e) {
            // ignore
          }
        }
      };
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await trackingApi.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await trackingApi.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const closePopup = () => setPopup(null);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      stompClient,
      popup,
      closePopup,
      markAsRead,
      markAllRead,
      fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
