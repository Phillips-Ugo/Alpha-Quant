import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { 
  PlusIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import UploadPortfolioQuickAction from '../components/UploadPortfolioQuickAction';
import toast from 'react-hot-toast';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchPortfolioData = async () => {
    try {
      const response = await axios.get('/api/portfolio');
      if (response.data.success) {
        setPortfolio(response.data.portfolio || []);
        setAnalytics(response.data.analytics || null);
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const handlePortfolioUpload = (uploadedData) => {
    setPortfolio(uploadedData);
    toast.success('Portfolio updated successfully!');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Portfolio history chart data: use real user portfolio history from analytics
  const portfolioHistory = analytics?.history && analytics.history.length > 0
    ? analytics.history.map(item => ({ date: item.date, value: item.value }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-quant-gold font-mono drop-shadow-lg">Alpha Quant Portfolio</h1>
          <p className="text-quant-green font-mono">Track and manage your investments</p>
        </div>
        <button 
          className="btn-quant flex items-center animate-scale-in"
          onClick={() => setShowAddForm(true)}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Stock
        </button>
      </div>

      {/* Quick Action: Upload Portfolio */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Portfolio File (PDF/TXT)</h3>
        <UploadPortfolioQuickAction onPortfolioUpdate={handlePortfolioUpload} />
      </div>

      {/* Portfolio Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={portfolioHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [formatCurrency(value), 'Portfolio Value']} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Portfolio Table or Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Example card for each stock */}
        {portfolio.map((stock, idx) => (
          <div 
            key={stock.id || idx} 
            className="card-quant animate-fade-in"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-quant-gold font-mono">{stock.symbol}</h2>
                <p className="text-quant-green font-mono">Shares: {stock.shares}</p>
                <p className="text-quant-green font-mono">Purchase Price: ${stock.purchasePrice}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-quant-gold font-mono">{stock.purchaseDate}</span>
                {/* Add more analytics here if needed */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Portfolio; 