import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [formData, setFormData] = useState({
    symbol: '',
    shares: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      const [portfolioRes, analyticsRes] = await Promise.all([
        axios.get('/api/portfolio'),
        axios.get('/api/portfolio/analytics')
      ]);

      setPortfolio(portfolioRes.data.portfolio);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Portfolio data fetch error:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.symbol || !formData.shares || !formData.purchasePrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingStock) {
        await axios.put(`/api/portfolio/update/${editingStock.id}`, {
          shares: formData.shares,
          purchasePrice: formData.purchasePrice
        });
        toast.success('Stock updated successfully');
      } else {
        await axios.post('/api/portfolio/add', formData);
        toast.success('Stock added successfully');
      }
      
      setShowAddForm(false);
      setEditingStock(null);
      setFormData({
        symbol: '',
        shares: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0]
      });
      fetchPortfolioData();
    } catch (error) {
      console.error('Portfolio operation error:', error);
      toast.error('Operation failed');
    }
  };

  const handleEdit = (stock) => {
    setEditingStock(stock);
    setFormData({
      symbol: stock.symbol,
      shares: stock.shares.toString(),
      purchasePrice: stock.purchasePrice.toString(),
      purchaseDate: stock.purchaseDate.split('T')[0]
    });
    setShowAddForm(true);
  };

  const handleDelete = async (stockId) => {
    if (!window.confirm('Are you sure you want to remove this stock?')) return;

    try {
      await axios.delete(`/api/portfolio/remove/${stockId}`);
      toast.success('Stock removed successfully');
      fetchPortfolioData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove stock');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getColorForPerformance = (value) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getIconForPerformance = (value) => {
    return value >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  // Mock data for charts (replace with real data)
  const portfolioHistory = [
    { date: 'Jan', value: 100000 },
    { date: 'Feb', value: 105000 },
    { date: 'Mar', value: 98000 },
    { date: 'Apr', value: 112000 },
    { date: 'May', value: 108000 },
    { date: 'Jun', value: 115000 },
  ];

  const sectorData = portfolio.length > 0 ? [
    { name: 'Technology', value: 45, color: '#3B82F6' },
    { name: 'Healthcare', value: 25, color: '#10B981' },
    { name: 'Finance', value: 20, color: '#F59E0B' },
    { name: 'Consumer', value: 10, color: '#EF4444' },
  ] : [
    { name: 'No Data', value: 100, color: '#9CA3AF' }
  ];

  const performanceData = portfolio.map(stock => ({
    symbol: stock.symbol,
    performance: stock.gainLossPercentage,
    value: stock.totalValue
  }));

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-quant-gold font-mono drop-shadow-lg">QuantaVista Portfolio</h1>
          <p className="text-quant-green font-mono">Track and manage your investments</p>
        </div>
        <button className="btn-quant flex items-center">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Stock
        </button>
      </div>
      {/* Portfolio Table or Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Example card for each stock */}
        {portfolio.map((stock, idx) => (
          <div key={idx} className="card-quant">
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