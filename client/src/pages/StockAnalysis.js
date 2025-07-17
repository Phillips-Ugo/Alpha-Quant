import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StockSearch from '../components/StockSearch';
import StockCharts from '../components/StockCharts';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  ChartPieIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

const StockAnalysis = () => {
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [statistics, setStatistics] = useState(null);

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    analyzeStock(stock.symbol);
  };

  const analyzeStock = async (symbol) => {
    if (!symbol) {
      toast.error('Please select a stock');
      return;
    }

    setLoading(true);
    setStockData(null);
    setPrediction(null);
    setStatistics(null);

    try {
      // First get current stock data
      const dataResponse = await axios.get(`/api/stocks/data/${symbol.toUpperCase()}`);
      
      if (dataResponse.data.success) {
        setStockData(dataResponse.data);
        toast.success(`Data loaded for ${symbol.toUpperCase()}`);
      } else {
        toast.error(dataResponse.data.error || 'Failed to load stock data');
        return;
      }

      // Then get prediction
      const predictionResponse = await axios.post('/api/stocks/analyze', {
        ticker: symbol.toUpperCase(),
        daysAhead: 30
      });

      if (predictionResponse.data.success) {
        setPrediction(predictionResponse.data);
        toast.success('Analysis completed!');
      } else {
        toast.error(predictionResponse.data.error || 'Failed to generate prediction');
      }

      // Get statistics and chart data
      const statisticsResponse = await axios.get(`/api/stocks/statistics/${symbol.toUpperCase()}`);
      
      if (statisticsResponse.data.success) {
        setStatistics(statisticsResponse.data);
      } else {
        console.warn('Failed to load statistics:', statisticsResponse.data.error);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      if (error.response?.status === 404) {
        toast.error(`Stock symbol "${symbol.toUpperCase()}" not found. Please check the symbol and try again.`);
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to analyze stock');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getChangeColor = (change) => {
    if (change === undefined || change === null || isNaN(change)) return 'text-gray-400';
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getChangeIcon = (change) => {
    return change >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const formatPercentage = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-quant">
        <h1 className="text-3xl font-extrabold text-quant-gold mb-4 font-mono drop-shadow-lg">QuantaVista Stock Analysis</h1>
        <p className="text-quant-green font-mono mb-6">Get real-time stock data and AI-powered price predictions with advanced technical analysis</p>
        
        {/* Input Section */}
        <div className="mb-6">
          <StockSearch 
            onStockSelect={handleStockSelect}
            placeholder="Search for stocks (e.g., Apple, AAPL, Tesla, TSLA)"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card-quant text-center py-12 animate-pulse-glow">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-quant-gold mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-quant-gold mb-2 font-mono">Analyzing Stock...</h3>
          <p className="text-quant-green font-mono">Fetching real-time data and generating predictions</p>
        </div>
      )}

      {/* Stock Data */}
      {!stockData && !loading && (
        <div className="card-quant text-center py-12">
          <ChartBarIcon className="h-16 w-16 text-quant-gold mx-auto mb-4" />
          <h3 className="text-xl font-bold text-quant-gold mb-2 font-mono">Ready to Analyze</h3>
          <p className="text-quant-green font-mono">Search for a stock above to get real-time market data, predictions, and technical analysis</p>
        </div>
      )}
      
      {stockData && !loading && (
        <div className="card-quant animate-fade-in">
          <h2 className="text-2xl font-bold text-quant-gold mb-4 font-mono">
            {stockData.companyName} ({stockData.symbol})
          </h2>
          
          {/* Current Price and Change */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Current Price</span>
                <CurrencyDollarIcon className="h-6 w-6 text-quant-gold" />
              </div>
              <div className="text-2xl font-bold text-quant-gold mt-2">
                {formatCurrency(stockData.currentPrice)}
              </div>
            </div>
            
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Change</span>
                {React.createElement(getChangeIcon(stockData.change), { className: "h-6 w-6 " + getChangeColor(stockData.change) })}
              </div>
              <div className={`text-2xl font-bold mt-2 ${getChangeColor(stockData.change)}`}>
                {stockData.change >= 0 ? '+' : ''}{formatCurrency(stockData.change)}
              </div>
              <div className={`text-sm ${getChangeColor(stockData.change)}`}>
                {stockData.changePercent !== undefined && stockData.changePercent !== null 
                  ? `${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%`
                  : 'N/A'
                }
              </div>
            </div>
            
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Volume</span>
                <ChartBarIcon className="h-6 w-6 text-quant-gold" />
              </div>
              <div className="text-2xl font-bold text-quant-gold mt-2">
                {formatNumber(stockData.volume)}
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <h3 className="text-lg font-bold text-quant-gold mb-3 font-mono">Company Information</h3>
              <div className="space-y-2 text-quant-green font-mono">
                <div><span className="text-quant-gold">Sector:</span> {stockData.sector}</div>
                <div><span className="text-quant-gold">Industry:</span> {stockData.industry}</div>
                <div><span className="text-quant-gold">Market Cap:</span> {formatCurrency(stockData.marketCap)}</div>
                <div><span className="text-quant-gold">P/E Ratio:</span> {stockData.peRatio ? stockData.peRatio.toFixed(2) : 'N/A'}</div>
                <div><span className="text-quant-gold">Dividend Yield:</span> {stockData.dividendYield ? (stockData.dividendYield * 100).toFixed(2) + '%' : 'N/A'}</div>
              </div>
            </div>
            
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <h3 className="text-lg font-bold text-quant-gold mb-3 font-mono">52-Week Range</h3>
              <div className="space-y-2 text-quant-green font-mono">
                <div><span className="text-quant-gold">High:</span> {formatCurrency(stockData.high52Week)}</div>
                <div><span className="text-quant-gold">Low:</span> {formatCurrency(stockData.low52Week)}</div>
                <div><span className="text-quant-gold">Previous Close:</span> {formatCurrency(stockData.previousClose)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Results */}
      {prediction && !loading && (
        <div className="card-quant animate-slide-in">
          <h2 className="text-2xl font-bold text-quant-gold mb-4 font-mono flex items-center gap-2">
            <SparklesIcon className="h-6 w-6" />
            LSTM Price Prediction
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Current Price</span>
                <CurrencyDollarIcon className="h-6 w-6 text-quant-gold" />
              </div>
              <div className="text-2xl font-bold text-quant-gold mt-2">
                {formatCurrency(prediction.currentPrice || prediction.current_price)}
              </div>
            </div>
            
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Predicted Price</span>
                <ChartBarIcon className="h-6 w-6 text-quant-gold" />
              </div>
              <div className="text-2xl font-bold text-quant-gold mt-2">
                {formatCurrency(prediction.predictedPrice || prediction.predicted_price)}
              </div>
              <div className="text-sm text-quant-green mt-1">
                {prediction.prediction_date}
              </div>
            </div>
            
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Confidence</span>
                <ClockIcon className="h-6 w-6 text-quant-gold" />
              </div>
              <div className="text-2xl font-bold text-quant-gold mt-2">
                {prediction.confidence ? (prediction.confidence * 100).toFixed(1) : 'N/A'}%
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-quant-dark rounded-lg border border-quant-gold">
            <p className="text-quant-green font-mono text-sm">
              <span className="text-quant-gold font-bold">LSTM Model:</span> This prediction is generated using a Long Short-Term Memory neural network 
              trained on historical stock data. The model analyzes price patterns over the past 60 days to predict future prices.
            </p>
          </div>
        </div>
      )}

      {/* Charts and Visualizations */}
      {prediction && !loading && prediction.dates && (
        <StockCharts predictionData={prediction} />
      )}

      {/* Statistical Analysis */}
      {statistics && !loading && (
        <div className="card-quant animate-scale-in">
          <h2 className="text-2xl font-bold text-quant-gold mb-4 font-mono flex items-center gap-2">
            <ChartPieIcon className="h-6 w-6" />
            Technical Analysis & Statistics
          </h2>
          
          {/* Price Performance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="text-sm text-quant-green font-mono">1 Day</div>
              <div className={`text-lg font-bold ${getChangeColor(statistics.priceChange1DPercent || 0)}`}>
                {formatPercentage(statistics.priceChange1DPercent || 0)}
              </div>
            </div>
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="text-sm text-quant-green font-mono">1 Week</div>
              <div className={`text-lg font-bold ${getChangeColor(statistics.priceChange1W || 0)}`}>
                {formatPercentage(statistics.priceChange1W || 0)}
              </div>
            </div>
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="text-sm text-quant-green font-mono">1 Month</div>
              <div className={`text-lg font-bold ${getChangeColor(statistics.priceChange1M || 0)}`}>
                {formatPercentage(statistics.priceChange1M || 0)}
              </div>
            </div>
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="text-sm text-quant-green font-mono">3 Months</div>
              <div className={`text-lg font-bold ${getChangeColor(statistics.priceChange3M || 0)}`}>
                {formatPercentage(statistics.priceChange3M || 0)}
              </div>
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <h3 className="text-lg font-bold text-quant-gold mb-3 font-mono">Moving Averages</h3>
              <div className="space-y-2 text-quant-green font-mono">
                <div className="flex justify-between">
                  <span>SMA 20:</span>
                  <span className="text-quant-gold">
                    {formatCurrency(statistics.sma20 || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>SMA 50:</span>
                  <span className="text-quant-gold">
                    {formatCurrency(statistics.sma50 || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>SMA 200:</span>
                  <span className="text-quant-gold">
                    {formatCurrency(statistics.sma200 || 0)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <h3 className="text-lg font-bold text-quant-gold mb-3 font-mono">Support & Resistance</h3>
              <div className="space-y-2 text-quant-green font-mono">
                <div className="flex justify-between">
                  <span>Support Level:</span>
                  <span className="text-green-400">{formatCurrency(statistics.supportLevel || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Resistance Level:</span>
                  <span className="text-red-400">{formatCurrency(statistics.resistanceLevel || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Volatility (20d):</span>
                  <span className="text-quant-gold">{(statistics.volatility || 0).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Volume Analysis */}
          <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold mb-6">
            <h3 className="text-lg font-bold text-quant-gold mb-3 font-mono">Volume Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 text-quant-green font-mono">
              <div className="flex justify-between">
                <span>Current Volume:</span>
                <span>{formatNumber(stockData?.volume || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Volume (20d):</span>
                <span>{formatNumber(statistics.volumeAvg20 || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Volume Ratio:</span>
                <span className={(statistics.volumeRatio || 0) > 1 ? 'text-green-400' : 'text-red-400'}>
                  {(statistics.volumeRatio || 0).toFixed(2)}x
                </span>
              </div>
            </div>
          </div>

          {/* Chart Data Info */}
          <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
            <h3 className="text-lg font-bold text-quant-gold mb-3 font-mono">Available Chart Data</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 text-quant-green font-mono text-sm">
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="h-4 w-4 text-quant-gold" />
                <span>Price Data</span>
              </div>
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-4 w-4 text-quant-gold" />
                <span>Volume</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="h-4 w-4 text-quant-gold" />
                <span>Moving Averages</span>
              </div>
              <div className="flex items-center gap-2">
                <ChartPieIcon className="h-4 w-4 text-quant-gold" />
                <span>RSI & MACD</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="h-4 w-4 text-quant-gold" />
                <span>Bollinger Bands</span>
              </div>
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-4 w-4 text-quant-gold" />
                <span>Stochastic</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="h-4 w-4 text-quant-gold" />
                <span>Momentum</span>
              </div>
              <div className="flex items-center gap-2">
                <ChartPieIcon className="h-4 w-4 text-quant-gold" />
                <span>Volatility</span>
              </div>
            </div>
            <p className="text-quant-green font-mono text-xs mt-3">
              <span className="text-quant-gold font-bold">Note:</span> Advanced chart visualization with these indicators can be implemented 
              using libraries like Chart.js or D3.js for interactive technical analysis displays.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAnalysis; 