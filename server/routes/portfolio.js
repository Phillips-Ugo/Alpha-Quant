const express = require('express');
const router = express.Router();
const yahooFinanceService = require('../services/yahooFinance');

// Persistent portfolio storage using file system
const fs = require('fs');
const path = require('path');

const portfolioDataPath = path.join(__dirname, '../data/portfolios.json');

// Helper function to load portfolios from file
function loadPortfolios() {
  try {
    if (fs.existsSync(portfolioDataPath)) {
      const fileContent = fs.readFileSync(portfolioDataPath, 'utf8').trim();
      if (fileContent) {
        return JSON.parse(fileContent);
      }
    }
  } catch (error) {
    console.error('Error loading portfolios:', error.message);
    // If JSON is corrupted, backup and reset
    try {
      fs.renameSync(portfolioDataPath, portfolioDataPath + '.corrupted.' + Date.now());
      console.log('Corrupted portfolio file backed up, will create new one');
    } catch (backupError) {
      console.error('Could not backup corrupted file:', backupError.message);
    }
  }
  return {};
}

// Helper function to save portfolios to file
function savePortfolios(portfolios) {
  try {
    const dataDir = path.dirname(portfolioDataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(portfolioDataPath, JSON.stringify(portfolios, null, 2));
  } catch (error) {
    console.error('Error saving portfolios:', error);
  }
}

// Helper function to create default portfolio stocks
function createDefaultPortfolio() {
  const defaultStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', shares: 50 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', shares: 25 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', shares: 40 },
    { symbol: 'TSLA', name: 'Tesla Inc.', shares: 15 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 30 }
  ];

  return defaultStocks.map(stock => {
    // Generate random purchase prices (realistic ranges for each stock)
    const priceRanges = {
      'AAPL': { min: 150, max: 200 },
      'NVDA': { min: 400, max: 600 },
      'MSFT': { min: 300, max: 450 },
      'TSLA': { min: 200, max: 350 },
      'GOOGL': { min: 120, max: 180 }
    };

    const range = priceRanges[stock.symbol];
    const purchasePrice = Math.round((Math.random() * (range.max - range.min) + range.min) * 100) / 100;
    
    // Random purchase date within the last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const randomDate = new Date(oneYearAgo.getTime() + Math.random() * (Date.now() - oneYearAgo.getTime()));

    return {
      id: Date.now().toString() + Math.floor(Math.random() * 10000) + stock.symbol,
      symbol: stock.symbol,
      shares: stock.shares,
      purchasePrice: purchasePrice,
      purchaseDate: randomDate.toISOString()
    };
  });
}

// Get user portfolio with real-time data
router.get('/', async (req, res) => {
  try {
    const userId = 'default-user'; // Since we removed authentication, use a default user
    const portfolios = loadPortfolios();
    let userPortfolio = portfolios[userId] || [];
    
    // If portfolio is empty, create default stocks
    if (userPortfolio.length === 0) {
      console.log('Creating default portfolio for new user');
      userPortfolio = createDefaultPortfolio();
      
      // Save the default portfolio
      portfolios[userId] = userPortfolio;
      savePortfolios(portfolios);
      
      console.log('Default portfolio created with stocks:', userPortfolio.map(s => s.symbol).join(', '));
    }

    // Get real-time portfolio data
    const portfolioData = await yahooFinanceService.calculatePortfolioValue(userPortfolio);
    
    res.json({
      portfolio: portfolioData.holdings,
      totalValue: portfolioData.totalValue,
      totalGainLoss: portfolioData.totalGainLoss,
      totalGainLossPercent: portfolioData.totalGainLossPercent
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to get portfolio' });
  }
});

// Add stock to portfolio
// Batch add stocks to portfolio
router.post('/batch-add', async (req, res) => {
  try {
    const userId = 'default-user'; // Since we removed authentication, use a default user
    const stocks = req.body.stocks;
    if (!Array.isArray(stocks) || stocks.length === 0) {
      return res.status(400).json({ error: 'No stocks provided' });
    }
    
    const portfolios = loadPortfolios();
    if (!portfolios[userId]) portfolios[userId] = [];
    
    for (const stock of stocks) {
      if (stock.symbol && stock.shares && stock.purchasePrice) {
        // Copy all fields from LLM object
        const stockEntry = { ...stock };
        // Ensure unique id for frontend editing/deletion
        if (!stockEntry.id) {
          stockEntry.id = Date.now().toString() + Math.floor(Math.random() * 10000);
        }
        // Ensure purchaseDate is set from LLM if present
        stockEntry.purchaseDate = stock.purchaseDate || new Date().toISOString();
        portfolios[userId].push(stockEntry);
      }
    }
    
    // Save updated portfolios
    savePortfolios(portfolios);
    
    // Get updated portfolio with real-time data
    const portfolioData = await yahooFinanceService.calculatePortfolioValue(portfolios[userId]);
    res.json({
      message: 'Portfolio updated with batch upload',
      portfolio: portfolioData.holdings,
      totalValue: portfolioData.totalValue,
      totalGainLoss: portfolioData.totalGainLoss,
      totalGainLossPercent: portfolioData.totalGainLossPercent
    });
  } catch (error) {
    console.error('Batch add error:', error);
    res.status(500).json({ error: 'Failed to batch add stocks' });
  }
});
router.post('/add', async (req, res) => {
  try {
    const userId = 'default-user'; // Since we removed authentication, use a default user
    const { symbol, shares, purchasePrice, purchaseDate } = req.body;

    if (!symbol || !shares || !purchasePrice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get real-time stock data
    const stockQuote = await yahooFinanceService.getStockQuote(symbol.toUpperCase());
    
    const stockEntry = {
      id: Date.now().toString(),
      symbol: symbol.toUpperCase(),
      shares: parseFloat(shares),
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate: purchaseDate || new Date().toISOString(),
      avgPrice: parseFloat(purchasePrice), // For compatibility with Yahoo Finance service
      currentPrice: stockQuote.currentPrice,
      totalValue: parseFloat(shares) * stockQuote.currentPrice,
      gainLoss: (stockQuote.currentPrice - parseFloat(purchasePrice)) * parseFloat(shares),
      gainLossPercentage: ((stockQuote.currentPrice - parseFloat(purchasePrice)) / parseFloat(purchasePrice)) * 100
    };

    const portfolios = loadPortfolios();
    if (!portfolios[userId]) {
      portfolios[userId] = [];
    }

    // Check if stock already exists in portfolio
    const existingIndex = portfolios[userId].findIndex(stock => stock.symbol === symbol.toUpperCase());
    
    if (existingIndex !== -1) {
      // Update existing stock
      const existing = portfolios[userId][existingIndex];
      const totalShares = existing.shares + stockEntry.shares;
      const avgPurchasePrice = ((existing.shares * existing.avgPrice) + (stockEntry.shares * stockEntry.avgPrice)) / totalShares;
      
      portfolios[userId][existingIndex] = {
        ...existing,
        shares: totalShares,
        avgPrice: avgPurchasePrice,
        currentPrice: stockQuote.currentPrice,
        totalValue: totalShares * stockQuote.currentPrice,
        gainLoss: (stockQuote.currentPrice - avgPurchasePrice) * totalShares,
        gainLossPercentage: ((stockQuote.currentPrice - avgPurchasePrice) / avgPurchasePrice) * 100
      };
    } else {
      // Add new stock
      portfolios[userId].push(stockEntry);
    }
    
    // Save updated portfolios
    savePortfolios(portfolios);

    // Get updated portfolio with real-time data
    const portfolioData = await yahooFinanceService.calculatePortfolioValue(portfolios[userId]);

    res.status(201).json({
      message: 'Stock added to portfolio',
      portfolio: portfolioData.holdings,
      totalValue: portfolioData.totalValue,
      totalGainLoss: portfolioData.totalGainLoss,
      totalGainLossPercent: portfolioData.totalGainLossPercent
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Update stock in portfolio
router.put('/update/:stockId', (req, res) => {
  try {
    const userId = 'default-user'; // Since we removed authentication, use a default user
    const { stockId } = req.params;
    const { shares, purchasePrice } = req.body;

    const portfolios = loadPortfolios();
    if (!portfolios[userId]) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const stockIndex = portfolios[userId].findIndex(stock => stock.id === stockId);
    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found in portfolio' });
    }

    const stock = portfolios[userId][stockIndex];
    
    if (shares !== undefined) stock.shares = parseFloat(shares);
    if (purchasePrice !== undefined) stock.purchasePrice = parseFloat(purchasePrice);

    // Recalculate values
    stock.totalValue = stock.shares * stock.currentPrice;
    stock.gainLoss = (stock.currentPrice - stock.purchasePrice) * stock.shares;
    stock.gainLossPercentage = ((stock.currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100;

    res.json({
      message: 'Stock updated',
      portfolio: portfolios[userId],
      totalValue: calculateTotalValue(portfolios[userId])
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Remove stock from portfolio
router.delete('/remove/:stockId', (req, res) => {
  try {
    const userId = 'default-user'; // Since we removed authentication, use a default user
    const { stockId } = req.params;

    const portfolios = loadPortfolios();
    if (!portfolios[userId]) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const stockIndex = portfolios[userId].findIndex(stock => stock.id === stockId);
    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found in portfolio' });
    }

    portfolios[userId].splice(stockIndex, 1);
    
    // Save the updated portfolios to file
    savePortfolios(portfolios);

    res.json({
      message: 'Stock removed from portfolio',
      portfolio: portfolios[userId],
      totalValue: calculateTotalValue(portfolios[userId])
    });
  } catch (error) {
    console.error('Remove stock error:', error);
    res.status(500).json({ error: 'Failed to remove stock' });
  }
});

// Get portfolio analytics
router.get('/analytics', async (req, res) => {
  try {
    const userId = 'default-user'; // Since we removed authentication, use a default user
    const portfolios = loadPortfolios();
    const portfolio = portfolios[userId] || [];

    // Get real-time portfolio data with sector information
    const portfolioData = await yahooFinanceService.calculatePortfolioValue(portfolio);
    
    // Calculate sector breakdown from real data
    const sectorBreakdown = {};
    portfolioData.holdings.forEach(stock => {
      const sector = stock.sector || 'Unknown';
      sectorBreakdown[sector] = (sectorBreakdown[sector] || 0) + stock.currentValue;
    });

    const analytics = {
      totalStocks: portfolio.length,
      totalValue: portfolioData.totalValue,
      totalGainLoss: portfolioData.totalGainLoss,
      totalGainLossPercentage: portfolioData.totalGainLossPercent,
      topPerformers: portfolioData.holdings
        .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
        .slice(0, 5),
      worstPerformers: portfolioData.holdings
        .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
        .slice(0, 5),
      sectorBreakdown: sectorBreakdown
    };

    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Helper functions
function calculateTotalValue(portfolio) {
  return portfolio.reduce((sum, stock) => sum + stock.totalValue, 0);
}

function calculateTotalGainLossPercentage(portfolio) {
  if (portfolio.length === 0) return 0;
  const totalInvested = portfolio.reduce((sum, stock) => sum + (stock.shares * stock.purchasePrice), 0);
  const totalGainLoss = portfolio.reduce((sum, stock) => sum + stock.gainLoss, 0);
  return totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
}

function calculateSectorBreakdown(portfolio) {
  // Mock sector data (in real app, you'd get this from a stock API)
  const sectors = {};
  portfolio.forEach(stock => {
    const sector = getStockSector(stock.symbol) || 'Unknown';
    sectors[sector] = (sectors[sector] || 0) + stock.totalValue;
  });
  return sectors;
}

async function getCurrentStockPrice(symbol) {
  // Use Yahoo Finance service for real-time price
  try {
    const quote = await yahooFinanceService.getStockQuote(symbol.toUpperCase());
    if (quote && quote.currentPrice) {
      return quote.currentPrice;
    }
    // Fallback: random price if API fails
    return Math.random() * 100 + 50;
  } catch (error) {
    console.error('Yahoo Finance price error:', error);
    return Math.random() * 100 + 50;
  }
}

function getStockSector(symbol) {
  // Mock sector data (replace with real API call)
  const sectorMap = {
    'AAPL': 'Technology',
    'GOOGL': 'Technology',
    'MSFT': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'NVDA': 'Technology',
    'META': 'Technology',
    'NFLX': 'Communication Services'
  };
  
  return sectorMap[symbol.toUpperCase()] || 'Unknown';
}

module.exports = router; 