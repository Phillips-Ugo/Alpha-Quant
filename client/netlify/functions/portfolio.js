const yahooFinance = require('yahoo-finance2').default;

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
      name: stock.name,
      shares: stock.shares,
      purchasePrice: purchasePrice,
      purchaseDate: randomDate.toISOString().split('T')[0]
    };
  });
}

// Helper function to calculate portfolio analytics
async function calculatePortfolioAnalytics(portfolio) {
  if (!portfolio || portfolio.length === 0) {
    return {
      totalValue: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      topPerformers: [],
      sectorBreakdown: {},
      history: []
    };
  }

  try {
    // Get current prices for all stocks
    const symbols = portfolio.map(stock => stock.symbol);
    const quotes = await yahooFinance.quote(symbols);
    
    // Calculate analytics
    let totalValue = 0;
    let totalCost = 0;
    const stockAnalytics = [];

    portfolio.forEach(stock => {
      const quote = Array.isArray(quotes) ? quotes.find(q => q.symbol === stock.symbol) : quotes;
      const currentPrice = quote?.regularMarketPrice || stock.purchasePrice;
      const currentValue = currentPrice * stock.shares;
      const costBasis = stock.purchasePrice * stock.shares;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = ((gainLoss / costBasis) * 100);

      totalValue += currentValue;
      totalCost += costBasis;

      stockAnalytics.push({
        ...stock,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent
      });
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

    // Get top performers
    const topPerformers = stockAnalytics
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 5);

    // Generate mock history data
    const history = [];
    const days = 30;
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const value = totalValue * (1 + randomVariation);
      history.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value * 100) / 100
      });
    }

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      totalGainLoss: Math.round(totalGainLoss * 100) / 100,
      totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100,
      topPerformers,
      sectorBreakdown: { 'Technology': 60, 'Healthcare': 20, 'Finance': 20 }, // Mock data
      history
    };

  } catch (error) {
    console.error('Error calculating portfolio analytics:', error);
    return {
      totalValue: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      topPerformers: [],
      sectorBreakdown: {},
      history: []
    };
  }
}

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    const userId = 'default-user'; // Since we don't have authentication yet

    if (event.httpMethod === 'GET') {
      // Get portfolio data
      const portfolio = createDefaultPortfolio();
      const analytics = await calculatePortfolioAnalytics(portfolio);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          portfolio,
          analytics
        })
      };
    }

    if (event.httpMethod === 'POST') {
      // Add new stock to portfolio
      const data = JSON.parse(event.body);
      const { symbol, shares, purchasePrice, purchaseDate } = data;

      if (!symbol || !shares || !purchasePrice) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: symbol, shares, purchasePrice'
          })
        };
      }

      // Get stock info from Yahoo Finance
      try {
        const quote = await yahooFinance.quote(symbol);
        const newStock = {
          id: Date.now().toString() + Math.floor(Math.random() * 10000) + symbol,
          symbol: symbol.toUpperCase(),
          name: quote.longName || quote.shortName || symbol,
          shares: parseInt(shares),
          purchasePrice: parseFloat(purchasePrice),
          purchaseDate: purchaseDate || new Date().toISOString().split('T')[0]
        };

        // In a real app, you'd save this to a database
        // For now, we'll just return the new stock
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            success: true,
            stock: newStock,
            message: 'Stock added to portfolio'
          })
        };
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid stock symbol'
          })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };

  } catch (error) {
    console.error('Portfolio function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};
