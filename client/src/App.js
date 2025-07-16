import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MarketStatusBar from './components/MarketStatusBar';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import AIChat from './pages/AIChat';
import News from './pages/News';
import StockAnalysis from './pages/StockAnalysis';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-quant-gradient">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <div className="min-h-screen bg-quant-gradient flex flex-col justify-center items-center">
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
      <div className="min-h-screen bg-quant-gradient flex">
        <Navbar onMenuClick={() => setSidebarOpen(true)} appName="QuantaVista" />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} appName="QuantaVista" />
        <div className="flex-1 flex flex-col lg:pl-64 pt-16">
          <MarketStatusBar />
          <main className="flex-1 p-2 sm:p-4 lg:p-6 w-full max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/news" element={<News />} />
              <Route path="/stock-analysis" element={<StockAnalysis />} />
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
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App; 