import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import AIChat from './pages/AIChat';
import News from './pages/News';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="lg:pl-64">
          <main className="p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/news" element={<News />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 