const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();
const jwt = require('jsonwebtoken');
const yahooFinanceService = require('../services/yahooFinance');
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Route to analyze a specific stock
router.post('/analyze', async (req, res) => {
  try {
    const { ticker, daysAhead = 30 } = req.body;
    
    if (!ticker) {
      return res.status(400).json({ 
        error: 'Ticker symbol is required',
        success: false 
      });
    }

    // Path to the Python script
    const pythonScriptPath = path.join(__dirname, '../../ml/lstm_stock_predictor.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python', [pythonScriptPath, ticker.toUpperCase(), daysAhead.toString()]);
    
    let result = '';
    let error = '';

    // Collect data from Python script
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', error);
        return res.status(500).json({
          error: 'Failed to analyze stock',
          details: error,
          success: false
        });
      }

      try {
        // Parse the JSON result from Python
        const stockData = JSON.parse(result);
        
        if (!stockData.success) {
          return res.status(400).json(stockData);
        }

        res.json({
          ...stockData,
          success: true
        });
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        res.status(500).json({
          error: 'Invalid response from analysis script',
          success: false
        });
      }
    });

    // Handle process errors
    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      res.status(500).json({
        error: 'Failed to start analysis process',
        success: false
      });
    });

  } catch (error) {
    console.error('Stock analysis error:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
});

// Route to get stock data without prediction
router.get('/data/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { period = '1y' } = req.query;
    
    if (!ticker) {
      return res.status(400).json({ 
        error: 'Ticker symbol is required',
        success: false 
      });
    }

    // Get real-time stock data from Yahoo Finance
    const stockData = await yahooFinanceService.getStockQuote(ticker.toUpperCase());

        res.json({
          ...stockData,
          success: true
    });

  } catch (error) {
    console.error('Stock data fetch error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch stock data',
      success: false
    });
  }
});

// Route to get stock statistics and chart data
router.get('/statistics/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    if (!ticker) {
      return res.status(400).json({ 
        error: 'Ticker symbol is required',
        success: false 
      });
    }

    // Get real statistics from Yahoo Finance
    const statistics = await yahooFinanceService.getStockStatistics(ticker.toUpperCase());
    
    res.json({
      ...statistics,
      success: true
    });

  } catch (error) {
    console.error('Statistics generation error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      success: false
    });
  }
});

// Route to get market overview
router.get('/market-overview', async (req, res) => {
  try {
    const marketData = await yahooFinanceService.getMarketOverview();
    res.json({
      ...marketData,
      success: true
    });
  } catch (error) {
    console.error('Market overview error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch market overview',
      success: false
    });
  }
});

// Route to search for stocks
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Search query is required',
        success: false 
      });
    }

    const searchResults = await yahooFinanceService.searchStocks(query);
    res.json({
      ...searchResults,
      success: true
    });
  } catch (error) {
    console.error('Stock search error:', error);
    res.status(500).json({
      error: error.message || 'Failed to search stocks',
      success: false
    });
  }
});

// Route to get historical data
router.get('/history/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { period = '1y', interval = '1d' } = req.query;
    
    if (!ticker) {
      return res.status(400).json({ 
        error: 'Ticker symbol is required',
        success: false 
      });
    }

    const history = await yahooFinanceService.getHistoricalData(ticker.toUpperCase(), period, interval);
    res.json({
      ...history,
      success: true
    });
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch historical data',
      success: false
    });
  }
});

// Get stock quote
router.get('/quote/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await getStockQuote(symbol);
    
    res.json(quote);
  } catch (error) {
    console.error('Get stock quote error:', error);
    res.status(500).json({ error: 'Failed to fetch stock quote' });
  }
});

// Get multiple stock quotes
router.post('/quotes', authenticateToken, async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }
    
    const quotes = await Promise.all(
      symbols.map(symbol => getStockQuote(symbol))
    );
    
    res.json({ quotes });
  } catch (error) {
    console.error('Get multiple quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch stock quotes' });
  }
});

// Get stock historical data
router.get('/history/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y', interval = '1d' } = req.query;
    
    const history = await getStockHistory(symbol, period, interval);
    
    res.json(history);
  } catch (error) {
    console.error('Get stock history error:', error);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
});

// Search stocks
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const results = await searchStocks(query);
    
    res.json({ results });
  } catch (error) {
    console.error('Search stocks error:', error);
    res.status(500).json({ error: 'Failed to search stocks' });
  }
});

// Get market overview
router.get('/market-overview', authenticateToken, async (req, res) => {
  try {
    const overview = await getMarketOverview();
    
    res.json(overview);
  } catch (error) {
    console.error('Get market overview error:', error);
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

// Get stock quote
async function getStockQuote(symbol) {
  // Mock stock data (replace with real API)
  const mockQuotes = {
    'AAPL': {
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      currentPrice: 150.25,
      change: 2.15,
      changePercent: 1.45,
      previousClose: 148.10,
      open: 149.50,
      high: 151.75,
      low: 148.90,
      volume: 45678900,
      marketCap: 2370000000000,
      peRatio: 25.8,
      dividendYield: 0.65,
      sector: 'Technology',
      industry: 'Consumer Electronics'
    },
    'GOOGL': {
      symbol: 'GOOGL',
      companyName: 'Alphabet Inc.',
      currentPrice: 2750.50,
      change: -15.25,
      changePercent: -0.55,
      previousClose: 2765.75,
      open: 2760.00,
      high: 2775.25,
      low: 2745.50,
      volume: 1234567,
      marketCap: 1820000000000,
      peRatio: 28.5,
      dividendYield: 0.0,
      sector: 'Technology',
      industry: 'Internet Content & Information'
    },
    'MSFT': {
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      currentPrice: 310.75,
      change: 5.25,
      changePercent: 1.72,
      previousClose: 305.50,
      open: 306.00,
      high: 312.25,
      low: 305.75,
      volume: 23456789,
      marketCap: 2310000000000,
      peRatio: 32.1,
      dividendYield: 0.85,
      sector: 'Technology',
      industry: 'Software'
    },
    'AMZN': {
      symbol: 'AMZN',
      companyName: 'Amazon.com Inc.',
      currentPrice: 3300.00,
      change: 45.50,
      changePercent: 1.40,
      previousClose: 3254.50,
      open: 3260.00,
      high: 3310.25,
      low: 3255.75,
      volume: 3456789,
      marketCap: 1650000000000,
      peRatio: 45.2,
      dividendYield: 0.0,
      sector: 'Consumer Discretionary',
      industry: 'Internet Retail'
    },
    'TSLA': {
      symbol: 'TSLA',
      companyName: 'Tesla Inc.',
      currentPrice: 850.25,
      change: -12.75,
      changePercent: -1.48,
      previousClose: 863.00,
      open: 865.50,
      high: 870.25,
      low: 845.75,
      volume: 5678901,
      marketCap: 850000000000,
      peRatio: 85.3,
      dividendYield: 0.0,
      sector: 'Consumer Discretionary',
      industry: 'Auto Manufacturers'
    }
  };
  
  const quote = mockQuotes[symbol.toUpperCase()];
  
  if (!quote) {
    // Generate mock data for unknown symbols
    const basePrice = Math.random() * 200 + 50;
    return {
      symbol: symbol.toUpperCase(),
      companyName: `${symbol.toUpperCase()} Corporation`,
      currentPrice: basePrice,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      previousClose: basePrice - (Math.random() - 0.5) * 5,
      open: basePrice - (Math.random() - 0.5) * 3,
      high: basePrice + Math.random() * 5,
      low: basePrice - Math.random() * 5,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      marketCap: Math.floor(Math.random() * 100000000000) + 10000000000,
      peRatio: Math.random() * 50 + 10,
      dividendYield: Math.random() * 3,
      sector: 'Unknown',
      industry: 'Unknown'
    };
  }
  
  return quote;
}

// Get stock historical data
async function getStockHistory(symbol, period, interval) {
  // Mock historical data (replace with real API)
  const days = period === '1m' ? 30 : period === '3m' ? 90 : period === '6m' ? 180 : 365;
  const data = [];
  
  const basePrice = 100 + Math.random() * 100;
  let currentPrice = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate price movement
    const change = (Math.random() - 0.5) * 2;
    currentPrice = Math.max(currentPrice + change, 1);
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: currentPrice - Math.random() * 2,
      high: currentPrice + Math.random() * 3,
      low: currentPrice - Math.random() * 3,
      close: currentPrice,
      volume: Math.floor(Math.random() * 1000000) + 100000
    });
  }
  
  return {
    symbol: symbol.toUpperCase(),
    period,
    interval,
    data
  };
}

// Search stocks
async function searchStocks(query) {
  // Mock search results (replace with real API)
  const allStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' }
  ];
  
  const results = allStocks.filter(stock => 
    stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
    stock.name.toLowerCase().includes(query.toLowerCase())
  );
  
  return results.slice(0, 10); // Limit to 10 results
}

// Get market overview
async function getMarketOverview() {
  // Mock market data (replace with real API)
  return {
    sp500: {
      symbol: '^GSPC',
      name: 'S&P 500',
      currentPrice: 4150.25,
      change: 25.50,
      changePercent: 0.62
    },
    nasdaq: {
      symbol: '^IXIC',
      name: 'NASDAQ Composite',
      currentPrice: 12850.75,
      change: 45.25,
      changePercent: 0.35
    },
    dow: {
      symbol: '^DJI',
      name: 'Dow Jones Industrial Average',
      currentPrice: 32500.50,
      change: -15.75,
      changePercent: -0.05
    },
    vix: {
      symbol: '^VIX',
      name: 'CBOE Volatility Index',
      currentPrice: 22.5,
      change: -1.25,
      changePercent: -5.26
    },
    marketStatus: 'open',
    lastUpdated: new Date().toISOString()
  };
}

// Get stock fundamentals
router.get('/fundamentals/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const fundamentals = await getStockFundamentals(symbol);
    
    res.json(fundamentals);
  } catch (error) {
    console.error('Get fundamentals error:', error);
    res.status(500).json({ error: 'Failed to fetch fundamentals' });
  }
});

// Get stock fundamentals
async function getStockFundamentals(symbol) {
  // Mock fundamentals data (replace with real API)
  return {
    symbol: symbol.toUpperCase(),
    companyInfo: {
      name: `${symbol.toUpperCase()} Corporation`,
      sector: 'Technology',
      industry: 'Software',
      employees: Math.floor(Math.random() * 100000) + 1000,
      website: `https://www.${symbol.toLowerCase()}.com`
    },
    financialMetrics: {
      marketCap: Math.floor(Math.random() * 1000000000000) + 10000000000,
      enterpriseValue: Math.floor(Math.random() * 1000000000000) + 10000000000,
      peRatio: Math.random() * 50 + 10,
      forwardPE: Math.random() * 40 + 8,
      pegRatio: Math.random() * 3 + 0.5,
      priceToBook: Math.random() * 10 + 1,
      priceToSales: Math.random() * 20 + 1,
      dividendYield: Math.random() * 5,
      payoutRatio: Math.random() * 100
    },
    growthMetrics: {
      revenueGrowth: (Math.random() - 0.5) * 50,
      earningsGrowth: (Math.random() - 0.5) * 60,
      profitMargin: Math.random() * 30,
      operatingMargin: Math.random() * 25,
      returnOnEquity: Math.random() * 30,
      returnOnAssets: Math.random() * 15
    },
    balanceSheet: {
      totalCash: Math.floor(Math.random() * 100000000000) + 1000000000,
      totalDebt: Math.floor(Math.random() * 50000000000) + 1000000000,
      debtToEquity: Math.random() * 2,
      currentRatio: Math.random() * 3 + 1,
      quickRatio: Math.random() * 2.5 + 0.5
    }
  };
}

module.exports = router; 