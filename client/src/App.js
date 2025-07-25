import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MarketStatusBar from './components/MarketStatusBar';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import AIChat from './pages/AIChat';
import News from './pages/News';
import StockAnalysis from './pages/StockAnalysis';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-quant-gradient flex">
        <Navbar onMenuClick={() => setSidebarOpen(true)} appName="Alpha Quant" />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} appName="Alpha Quant" />
        <div className="flex-1 flex flex-col lg:pl-64 pt-16">
          <MarketStatusBar />
          <main className="flex-1 p-2 sm:p-4 lg:p-6 w-full max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
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

export default App; 