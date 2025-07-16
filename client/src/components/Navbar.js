import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Navbar = ({ onMenuClick, appName = 'QuantaVista' }) => {
  const { user, logout } = useAuth();
  const { 
    notifications, 
    showNotificationPanel, 
    setShowNotificationPanel, 
    getUnreadCount, 
    markAsRead, 
    deleteNotification,
    getSeverityColor,
    getSeverityIcon,
    formatTime
  } = useNotifications();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <>
      <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg border-b border-gray-700 fixed top-0 left-0 right-0 z-50 lg:left-64 font-mono transition-all duration-300">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-md text-yellow-400 hover:text-green-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500 transition-colors duration-200"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <div className="flex items-center ml-4 lg:ml-0">
                <ChartBarIcon className="h-8 w-8 text-green-400" />
                <h1 className="ml-2 text-2xl font-extrabold text-yellow-400 tracking-tight drop-shadow-lg font-mono">
                  {appName}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Market Status Indicator */}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-green-900 bg-opacity-50 rounded-full border border-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-green-400">MARKET OPEN</span>
              </div>
              
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className="p-2 rounded-md text-yellow-400 hover:text-green-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500 transition-colors duration-200 relative"
                >
                  <BellIcon className="h-6 w-6" />
                  {getUnreadCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {getUnreadCount() > 9 ? '9+' : getUnreadCount()}
                    </span>
                  )}
                </button>
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-md text-yellow-400 hover:text-green-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500 transition-colors duration-200"
                >
                  <UserCircleIcon className="h-6 w-6" />
                  <span className="hidden md:block text-sm font-bold text-yellow-300">
                    {user?.name || 'User'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 text-sm text-yellow-300 border-b border-gray-700">
                      <div className="font-bold">{user?.name}</div>
                      <div className="text-yellow-500">{user?.email}</div>
                    </div>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-yellow-300 hover:bg-gray-800">
                      <Cog6ToothIcon className="h-4 w-4 mr-2" />
                      Settings
                    </button>
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-4 py-2 text-sm text-yellow-300 hover:bg-gray-800"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Notification Panel */}
      {showNotificationPanel && (
        <div className="fixed top-16 right-4 lg:right-8 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-yellow-400">Notifications</h3>
              <button
                onClick={() => setShowNotificationPanel(false)}
                className="text-gray-400 hover:text-yellow-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <BellIcon className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 mb-2 rounded-lg border-l-4 ${getSeverityColor(notification.severity)} bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer ${
                    !notification.read ? 'border-l-4' : 'border-l-2'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{getSeverityIcon(notification.severity)}</span>
                        <h4 className="font-bold text-yellow-300">{notification.title}</h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">{formatTime(notification.timestamp)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="text-gray-500 hover:text-red-400 ml-2"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar; 