import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-40 lg:left-64">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center ml-4 lg:ml-0">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">
                Financial Analysis
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <BellIcon className="h-6 w-6" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <UserCircleIcon className="h-6 w-6" />
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.name || 'User'}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-gray-500">{user?.email}</div>
                  </div>
                  
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Cog6ToothIcon className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  
                  <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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

      {/* Overlay for mobile menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar; 