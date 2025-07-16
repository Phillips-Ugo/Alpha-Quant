import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const StockAnalysis = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const handleAnalyze = async () => {
    if (!symbol.trim()) {
      toast.error('Please enter a stock symbol');
      return;
    }

    setLoading(true);
    setStockData(null);
    setPrediction(null);

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getChangeColor = (change) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getChangeIcon = (change) => {
    return change >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-quant">
        <h1 className="text-3xl font-extrabold text-quant-gold mb-4 font-mono drop-shadow-lg">QuantaVista Stock Analysis</h1>
        <p className="text-quant-green font-mono mb-6">Get real-time stock data and AI-powered price predictions</p>
        
        {/* Input Section */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="Enter stock symbol (e.g., AAPL)"
            className="flex-1 border border-quant-gold bg-quant-dark text-quant-gold p-3 rounded font-mono focus:ring-2 focus:ring-green-400 focus:outline-none transition-all duration-200"
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-quant px-8 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-quant-gold"></div>
            )}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Stock Data */}
      {!stockData && !loading && (
        <div className="card-quant text-center py-12">
          <ChartBarIcon className="h-16 w-16 text-quant-gold mx-auto mb-4" />
          <h3 className="text-xl font-bold text-quant-gold mb-2 font-mono">Ready to Analyze</h3>
          <p className="text-quant-green font-mono">Enter a stock symbol above to get real-time market data and predictions</p>
        </div>
      )}
      
      {stockData && (
        <div className="card-quant">
          <h2 className="text-2xl font-bold text-quant-gold mb-4 font-mono">
            {stockData.company_name} ({stockData.ticker})
          </h2>
          
          {/* Current Price and Change */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Current Price</span>
                <CurrencyDollarIcon className="h-6 w-6 text-quant-gold" />
              </div>
              <div className="text-2xl font-bold text-quant-gold mt-2">
                {formatCurrency(stockData.current_price)}
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
                {stockData.change_percent >= 0 ? '+' : ''}{stockData.change_percent.toFixed(2)}%
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
                <div><span className="text-quant-gold">Market Cap:</span> {formatCurrency(stockData.market_cap)}</div>
                <div><span className="text-quant-gold">P/E Ratio:</span> {stockData.pe_ratio ? stockData.pe_ratio.toFixed(2) : 'N/A'}</div>
                <div><span className="text-quant-gold">Dividend Yield:</span> {stockData.dividend_yield ? (stockData.dividend_yield * 100).toFixed(2) + '%' : 'N/A'}</div>
              </div>
            </div>
            
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <h3 className="text-lg font-bold text-quant-gold mb-3 font-mono">52-Week Range</h3>
              <div className="space-y-2 text-quant-green font-mono">
                <div><span className="text-quant-gold">High:</span> {formatCurrency(stockData.high_52_week)}</div>
                <div><span className="text-quant-gold">Low:</span> {formatCurrency(stockData.low_52_week)}</div>
                <div><span className="text-quant-gold">Previous Close:</span> {formatCurrency(stockData.previous_close)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Results */}
      {prediction && (
        <div className="card-quant">
          <h2 className="text-2xl font-bold text-quant-gold mb-4 font-mono">AI Price Prediction</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Current Price</span>
                <CurrencyDollarIcon className="h-6 w-6 text-quant-gold" />
              </div>
              <div className="text-2xl font-bold text-quant-gold mt-2">
                {formatCurrency(prediction.current_price)}
              </div>
            </div>
            
            <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
              <div className="flex items-center justify-between">
                <span className="text-quant-green font-mono">Predicted Price</span>
                <ChartBarIcon className="h-6 w-6 text-quant-gold" />
              </div>
              <div className="text-2xl font-bold text-quant-gold mt-2">
                {formatCurrency(prediction.predicted_price)}
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
                {(prediction.confidence * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-quant-dark rounded-lg border border-quant-gold">
            <p className="text-quant-green font-mono text-sm">
              <span className="text-quant-gold font-bold">Note:</span> This is a placeholder prediction. 
              Replace the prediction logic in <code className="text-quant-gold">ml/lstm_stock_predictor.py</code> 
              with your actual LSTM model for real predictions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAnalysis; 