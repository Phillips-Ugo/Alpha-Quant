import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  XMarkIcon,
  HomeIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon,
  PlusIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ open, onClose, appName = 'QuantaVista' }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Portfolio', href: '/portfolio', icon: ChartBarIcon },
    { name: 'AI Chat', href: '/ai-chat', icon: ChatBubbleLeftRightIcon },
    { name: 'News & Events', href: '/news', icon: NewspaperIcon },
    { name: 'Stock Analysis', href: '/stock-analysis', icon: ChartBarIcon },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 font-mono
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-400" />
            <h2 className="ml-2 text-lg font-extrabold text-yellow-400 tracking-tight drop-shadow-lg font-mono">
              {appName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-yellow-400 hover:text-green-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500 transition-colors duration-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`
                  group flex items-center px-3 py-2 text-sm font-bold rounded-md transition-colors duration-200 font-mono
                  ${isActive(item.href)
                    ? 'bg-yellow-900 bg-opacity-30 text-yellow-300 border-r-4 border-green-400 shadow-lg'
                    : 'text-yellow-200 hover:bg-gray-800 hover:text-green-400'
                  }
                `}
              >
                <Icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive(item.href)
                      ? 'text-green-400'
                      : 'text-yellow-400 group-hover:text-green-400'
                    }
                  `}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        {/* Quick Actions */}
        <div className="px-4 py-4 border-t border-gray-800">
          <h3 className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="group flex items-center w-full px-3 py-2 text-sm font-bold text-yellow-200 rounded-md hover:bg-gray-800 hover:text-green-400 transition-colors duration-200 font-mono">
              <PlusIcon className="mr-3 h-5 w-5 text-yellow-400 group-hover:text-green-400" />
              Add Stock
            </button>
            <button className="group flex items-center w-full px-3 py-2 text-sm font-bold text-yellow-200 rounded-md hover:bg-gray-800 hover:text-green-400 transition-colors duration-200 font-mono">
              <DocumentArrowUpIcon className="mr-3 h-5 w-5 text-yellow-400 group-hover:text-green-400" />
              Upload Portfolio
            </button>
          </div>
        </div>
        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="text-xs text-yellow-500">
            <p>{appName}</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 