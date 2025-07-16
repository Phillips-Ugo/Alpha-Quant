import React, { createContext, useContext, useState, useEffect } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Simulate major market events
  useEffect(() => {
    const marketEvents = [
      {
        id: 1,
        type: 'market_crash',
        title: 'Market Volatility Alert',
        message: 'S&P 500 drops 3% - Consider reviewing your portfolio positions',
        severity: 'high',
        timestamp: new Date().toISOString(),
        read: false
      },
      {
        id: 2,
        type: 'fed_announcement',
        title: 'Federal Reserve Update',
        message: 'Fed announces interest rate decision - Impact on tech stocks expected',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        read: false
      },
      {
        id: 3,
        type: 'earnings_surprise',
        title: 'Major Earnings Surprise',
        message: 'AAPL reports 15% revenue growth - Stock up 8% in pre-market',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        read: false
      }
    ];

    // Add notifications with delays to simulate real-time events
    marketEvents.forEach((event, index) => {
      setTimeout(() => {
        addNotification(event);
        toast.success(`🔔 ${event.title}`, {
          duration: 5000,
          position: 'top-right',
          style: {
            background: '#1f2937',
            color: '#fbbf24',
            border: '1px solid #fbbf24'
          }
        });
      }, (index + 1) * 10000); // 10 seconds apart
    });
  }, []);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const getUnreadCount = () => {
    return notifications.filter(notif => !notif.read).length;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 border-red-400';
      case 'medium':
        return 'text-yellow-400 border-yellow-400';
      case 'low':
        return 'text-green-400 border-green-400';
      default:
        return 'text-blue-400 border-blue-400';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const value = {
    notifications,
    showNotificationPanel,
    setShowNotificationPanel,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    getSeverityColor,
    getSeverityIcon,
    formatTime
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
} 