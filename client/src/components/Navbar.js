import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bars3Icon, 
  UserCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Navbar = ({ onMenuClick, appName = 'QuantaVista' }) => {
  const { user, logout } = useAuth();
  // ...existing code...
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
              
              {/* Notifications removed */}

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

      {/* Notification Panel removed */}

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