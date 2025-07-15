const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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

// In-memory portfolio storage (replace with database in production)
let portfolios = {};

// Get user portfolio
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const userPortfolio = portfolios[userId] || [];
    
    res.json({
      portfolio: userPortfolio,
      totalValue: calculateTotalValue(userPortfolio)
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to get portfolio' });
  }
});

// Add stock to portfolio
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { symbol, shares, purchasePrice, purchaseDate } = req.body;

    if (!symbol || !shares || !purchasePrice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get current stock price (mock data for now)
    const currentPrice = await getCurrentStockPrice(symbol);
    
    const stockEntry = {
      id: Date.now().toString(),
      symbol: symbol.toUpperCase(),
      shares: parseFloat(shares),
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate: purchaseDate || new Date().toISOString(),
      currentPrice,
      totalValue: parseFloat(shares) * currentPrice,
      gainLoss: (currentPrice - parseFloat(purchasePrice)) * parseFloat(shares),
      gainLossPercentage: ((currentPrice - parseFloat(purchasePrice)) / parseFloat(purchasePrice)) * 100
    };

    if (!portfolios[userId]) {
      portfolios[userId] = [];
    }

    // Check if stock already exists in portfolio
    const existingIndex = portfolios[userId].findIndex(stock => stock.symbol === symbol.toUpperCase());
    
    if (existingIndex !== -1) {
      // Update existing stock
      const existing = portfolios[userId][existingIndex];
      const totalShares = existing.shares + stockEntry.shares;
      const avgPurchasePrice = ((existing.shares * existing.purchasePrice) + (stockEntry.shares * stockEntry.purchasePrice)) / totalShares;
      
      portfolios[userId][existingIndex] = {
        ...existing,
        shares: totalShares,
        purchasePrice: avgPurchasePrice,
        totalValue: totalShares * currentPrice,
        gainLoss: (currentPrice - avgPurchasePrice) * totalShares,
        gainLossPercentage: ((currentPrice - avgPurchasePrice) / avgPurchasePrice) * 100
      };
    } else {
      // Add new stock
      portfolios[userId].push(stockEntry);
    }

    res.status(201).json({
      message: 'Stock added to portfolio',
      portfolio: portfolios[userId],
      totalValue: calculateTotalValue(portfolios[userId])
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Update stock in portfolio
router.put('/update/:stockId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { stockId } = req.params;
    const { shares, purchasePrice } = req.body;

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
router.delete('/remove/:stockId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { stockId } = req.params;

    if (!portfolios[userId]) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const stockIndex = portfolios[userId].findIndex(stock => stock.id === stockId);
    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found in portfolio' });
    }

    portfolios[userId].splice(stockIndex, 1);

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
router.get('/analytics', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const portfolio = portfolios[userId] || [];

    const analytics = {
      totalStocks: portfolio.length,
      totalValue: calculateTotalValue(portfolio),
      totalGainLoss: portfolio.reduce((sum, stock) => sum + stock.gainLoss, 0),
      totalGainLossPercentage: calculateTotalGainLossPercentage(portfolio),
      topPerformers: portfolio
        .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
        .slice(0, 5),
      worstPerformers: portfolio
        .sort((a, b) => a.gainLossPercentage - b.gainLossPercentage)
        .slice(0, 5),
      sectorBreakdown: calculateSectorBreakdown(portfolio)
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
  // Mock stock price (replace with real API call)
  const mockPrices = {
    'AAPL': 150.25,
    'GOOGL': 2750.50,
    'MSFT': 310.75,
    'AMZN': 3300.00,
    'TSLA': 850.25,
    'NVDA': 450.75,
    'META': 320.50,
    'NFLX': 580.25
  };
  
  return mockPrices[symbol.toUpperCase()] || Math.random() * 100 + 50;
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