import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
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
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import StockSearch from '../components/StockSearch';

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [marketOverview, setMarketOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [shares, setShares] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [portfolioRes, analyticsRes, marketRes] = await Promise.all([
        axios.get('/api/portfolio'),
        axios.get('/api/portfolio/analytics'),
        axios.get('/api/stocks/market-overview')
      ]);

      setPortfolio(portfolioRes.data.portfolio || []);
      setAnalytics(analyticsRes.data || {});
      setMarketOverview(marketRes.data || {});
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getColorForPerformance = (value) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getIconForPerformance = (value) => {
    return value >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!selectedStock || !shares || !purchasePrice || isNaN(shares) || isNaN(purchasePrice) || Number(shares) <= 0 || Number(purchasePrice) <= 0) {
      toast.error('Please select a valid stock and enter valid shares and price.');
      return;
    }
    setAdding(true);
    try {
      await axios.post('/api/portfolio/add', {
        symbol: selectedStock.symbol,
        shares,
        purchasePrice,
        purchaseDate
      });
      toast.success('Stock added!');
      setShowAddModal(false);
      setSelectedStock(null);
      setShares('');
      setPurchasePrice('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add stock');
    } finally {
      setAdding(false);
    }
  };

  // Portfolio performance chart data
  // Use real portfolio data if available, otherwise fallback to mock data
  const portfolioHistory = analytics?.history && analytics.history.length > 0
    ? analytics.history.map(item => ({ date: item.date, value: item.value }))
    : [
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
          <h1 className="text-3xl font-extrabold text-quant-gold font-mono drop-shadow-lg">QuantaVista Dashboard</h1>
          <p className="text-quant-green font-mono">Welcome back! Here's your portfolio overview.</p>
        </div>
        <button className="btn-quant flex items-center" onClick={() => setShowAddModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Stock
        </button>
      </div>
      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-red-500" onClick={() => setShowAddModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Add Stock to Portfolio</h2>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <StockSearch onStockSelect={setSelectedStock} placeholder="Search for a stock..." />
                {selectedStock && (
                  <div className="mt-1 text-green-700 text-sm">Selected: {selectedStock.symbol} - {selectedStock.name}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shares</label>
                <input type="number" min="0" step="any" className="input-field w-full" value={shares} onChange={e => setShares(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                <input type="number" min="0" step="any" className="input-field w-full" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input type="date" className="input-field w-full" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required />
              </div>
              <button type="submit" className="btn-quant w-full" disabled={adding}>{adding ? 'Adding...' : 'Add Stock'}</button>
            </form>
          </div>
        </div>
      )}
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-quant">
          <div className="flex items-center">
            <div className="p-2 bg-quant-dark rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-quant-gold" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-quant-green">Total Value</p>
              <p className="text-2xl font-bold text-quant-gold">
                {formatCurrency(analytics?.totalValue || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card-quant">
          <div className="flex items-center">
            <div className="p-2 bg-quant-dark rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-quant-green" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-quant-green">Total Gain/Loss</p>
              <p className={`text-2xl font-bold ${getColorForPerformance(analytics?.totalGainLoss || 0)}`}>
                {formatCurrency(analytics?.totalGainLoss || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card-quant">
          <div className="flex items-center">
            <div className="p-2 bg-quant-dark rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-quant-gold" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-quant-green">Performance</p>
              <p className={`text-2xl font-bold ${getColorForPerformance(analytics?.totalGainLossPercentage || 0)}`}>
                {formatPercentage(analytics?.totalGainLossPercentage || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card-quant">
          <div className="flex items-center">
            <div className="p-2 bg-quant-dark rounded-lg">
              <EyeIcon className="h-6 w-6 text-quant-gold" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-quant-green">Total Stocks</p>
              <p className="text-2xl font-bold text-quant-gold">
                {analytics?.totalStocks || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Performance Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={portfolioHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Portfolio Value']}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sector Allocation */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sector Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Allocation']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Portfolio Holdings */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Holdings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shares
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gain/Loss
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolio.length > 0 ? (
                portfolio.map((stock) => {
                  const Icon = getIconForPerformance(stock.gainLossPercentage);
                  return (
                    <tr key={stock.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {stock.symbol}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stock.shares.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(stock.purchasePrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(stock.currentPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(stock.totalValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon className={`h-4 w-4 mr-1 ${getColorForPerformance(stock.gainLossPercentage)}`} />
                          <span className={`text-sm font-medium ${getColorForPerformance(stock.gainLossPercentage)}`}>
                            {formatPercentage(stock.gainLossPercentage)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No stocks in your portfolio</p>
                    <p className="text-sm">Add some stocks to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Overview */}
      {marketOverview && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(marketOverview).map(([key, data]) => {
              if (key === 'marketStatus' || key === 'lastUpdated') return null;
              const Icon = getIconForPerformance(data.changePercent);
              return (
                <div key={key} className="text-center">
                  <p className="text-sm text-gray-600">{data.name}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {data.currentPrice?.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-center">
                    <Icon className={`h-4 w-4 mr-1 ${getColorForPerformance(data.changePercent)}`} />
                    <span className={`text-sm ${getColorForPerformance(data.changePercent)}`}>
                      {formatPercentage(data.changePercent)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 