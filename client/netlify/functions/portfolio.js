const yahooFinance = require('yahoo-finance2').default;

// In-memory portfolio storage (in production, use a database)
let portfolios = {};

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

// Get real-time stock data
async function getStockData(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    return {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName,
      currentPrice: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      pe: quote.trailingPE,
      dividend: quote.dividendRate,
      dividendYield: quote.dividendYield,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      open: quote.regularMarketOpen,
      previousClose: quote.regularMarketPreviousClose,
      timestamp: quote.regularMarketTime
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

// Calculate portfolio analytics
function calculatePortfolioAnalytics(portfolio) {
  if (!portfolio || portfolio.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      totalGain: 0,
      totalGainPercent: 0,
      dailyChange: 0,
      dailyChangePercent: 0,
      bestPerformer: null,
      worstPerformer: null
    };
  }

  let totalValue = 0;
  let totalCost = 0;
  let totalDailyChange = 0;
  let bestPerformer = null;
  let worstPerformer = null;

  portfolio.forEach(stock => {
    const currentValue = stock.currentPrice * stock.shares;
    const costBasis = stock.purchasePrice * stock.shares;
    const gain = currentValue - costBasis;
    const gainPercent = (gain / costBasis) * 100;
    const dailyChange = (stock.change || 0) * stock.shares;

    totalValue += currentValue;
    totalCost += costBasis;
    totalDailyChange += dailyChange;

    if (!bestPerformer || gainPercent > bestPerformer.gainPercent) {
      bestPerformer = { symbol: stock.symbol, gainPercent };
    }
    if (!worstPerformer || gainPercent < worstPerformer.gainPercent) {
      worstPerformer = { symbol: stock.symbol, gainPercent };
    }
  });

  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const dailyChangePercent = totalValue > 0 ? (totalDailyChange / totalValue) * 100 : 0;

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalGain: Math.round(totalGain * 100) / 100,
    totalGainPercent: Math.round(totalGainPercent * 100) / 100,
    dailyChange: Math.round(totalDailyChange * 100) / 100,
    dailyChangePercent: Math.round(dailyChangePercent * 100) / 100,
    bestPerformer,
    worstPerformer
  };
}

// Get sector allocation
function getSectorAllocation(portfolio) {
  const sectorMap = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'NVDA': 'Technology',
    'TSLA': 'Consumer Discretionary',
    'AMZN': 'Consumer Discretionary',
    'META': 'Communication Services',
    'NFLX': 'Communication Services',
    'JPM': 'Financials',
    'BAC': 'Financials',
    'WMT': 'Consumer Staples',
    'JNJ': 'Health Care',
    'PFE': 'Health Care',
    'XOM': 'Energy',
    'CVX': 'Energy'
  };

  const sectorAllocation = {};
  let totalValue = 0;

  portfolio.forEach(stock => {
    const sector = sectorMap[stock.symbol] || 'Other';
    const value = stock.currentPrice * stock.shares;
    
    if (!sectorAllocation[sector]) {
      sectorAllocation[sector] = { value: 0, percentage: 0, stocks: [] };
    }
    
    sectorAllocation[sector].value += value;
    sectorAllocation[sector].stocks.push(stock.symbol);
    totalValue += value;
  });

  // Calculate percentages
  Object.keys(sectorAllocation).forEach(sector => {
    sectorAllocation[sector].percentage = totalValue > 0 ? 
      Math.round((sectorAllocation[sector].value / totalValue) * 100 * 100) / 100 : 0;
    sectorAllocation[sector].value = Math.round(sectorAllocation[sector].value * 100) / 100;
  });

  return sectorAllocation;
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
    const { path, httpMethod, queryStringParameters, body } = event;
    const userId = 'default-user'; // Since we removed authentication, use a default user

    // Get user portfolio with real-time data
    if (httpMethod === 'GET' && path.includes('/portfolio')) {
      let userPortfolio = portfolios[userId] || [];
      
      // If portfolio is empty, create default stocks
      if (userPortfolio.length === 0) {
        console.log('Creating default portfolio for new user');
        userPortfolio = createDefaultPortfolio();
        portfolios[userId] = userPortfolio;
        console.log('Default portfolio created with stocks:', userPortfolio.map(s => s.symbol).join(', '));
      }

      // Get real-time data for all stocks
      const portfolioWithData = [];
      for (const stock of userPortfolio) {
        const stockData = await getStockData(stock.symbol);
        if (stockData) {
          portfolioWithData.push({
            ...stock,
            ...stockData,
            currentValue: stockData.currentPrice * stock.shares,
            costBasis: stock.purchasePrice * stock.shares,
            gain: (stockData.currentPrice - stock.purchasePrice) * stock.shares,
            gainPercent: ((stockData.currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100
          });
        }
      }

      // Calculate portfolio analytics
      const analytics = calculatePortfolioAnalytics(portfolioWithData);
      const sectorAllocation = getSectorAllocation(portfolioWithData);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          portfolio: portfolioWithData,
          analytics,
          sectorAllocation,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Add new stock to portfolio
    if (httpMethod === 'POST' && path.includes('/portfolio')) {
      const data = JSON.parse(body);
      const { symbol, shares, purchasePrice, purchaseDate } = data;

      if (!symbol || !shares || !purchasePrice) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Symbol, shares, and purchase price are required'
          })
        });
      }

      // Validate stock exists
      const stockData = await getStockData(symbol);
      if (!stockData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid stock symbol'
          })
        };
      }

      // Check if stock already exists in portfolio
      let userPortfolio = portfolios[userId] || [];
      const existingStockIndex = userPortfolio.findIndex(stock => stock.symbol === symbol.toUpperCase());

      if (existingStockIndex >= 0) {
        // Update existing stock
        const existingStock = userPortfolio[existingStockIndex];
        const totalShares = existingStock.shares + shares;
        const totalCost = (existingStock.purchasePrice * existingStock.shares) + (purchasePrice * shares);
        const averagePrice = totalCost / totalShares;

        userPortfolio[existingStockIndex] = {
          ...existingStock,
          shares: totalShares,
          purchasePrice: Math.round(averagePrice * 100) / 100
        };
      } else {
        // Add new stock
        const newStock = {
          id: Date.now().toString() + Math.floor(Math.random() * 10000) + symbol,
          symbol: symbol.toUpperCase(),
          shares: shares,
          purchasePrice: purchasePrice,
          purchaseDate: purchaseDate || new Date().toISOString()
        };
        userPortfolio.push(newStock);
      }

      portfolios[userId] = userPortfolio;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Stock added to portfolio successfully',
          portfolio: userPortfolio
        })
      };
    }

    // Update stock in portfolio
    if (httpMethod === 'PUT' && path.includes('/portfolio')) {
      const data = JSON.parse(body);
      const { id, shares, purchasePrice } = data;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Stock ID is required'
          })
        });
      }

      let userPortfolio = portfolios[userId] || [];
      const stockIndex = userPortfolio.findIndex(stock => stock.id === id);

      if (stockIndex === -1) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Stock not found in portfolio'
          })
        });
      }

      if (shares !== undefined) {
        userPortfolio[stockIndex].shares = shares;
      }
      if (purchasePrice !== undefined) {
        userPortfolio[stockIndex].purchasePrice = purchasePrice;
      }

      portfolios[userId] = userPortfolio;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Stock updated successfully',
          portfolio: userPortfolio
        })
      };
    }

    // Remove stock from portfolio
    if (httpMethod === 'DELETE' && path.includes('/portfolio')) {
      const { id } = queryStringParameters;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Stock ID is required'
          })
        });
      }

      let userPortfolio = portfolios[userId] || [];
      const stockIndex = userPortfolio.findIndex(stock => stock.id === id);

      if (stockIndex === -1) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Stock not found in portfolio'
          })
        });
      }

      userPortfolio.splice(stockIndex, 1);
      portfolios[userId] = userPortfolio;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Stock removed from portfolio successfully',
          portfolio: userPortfolio
        })
      };
    }

    // Get portfolio performance history
    if (httpMethod === 'GET' && path.includes('/performance')) {
      const { days = 30 } = queryStringParameters;
      let userPortfolio = portfolios[userId] || [];

      if (userPortfolio.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            performance: [],
            message: 'No portfolio data available'
          })
        });
      }

      // Generate mock performance data
      const performance = [];
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const baseValue = 100000; // Base portfolio value
        const dailyChange = (Math.random() - 0.5) * 0.02; // ±1% daily change
        const value = baseValue * (1 + dailyChange);
        
        performance.push({
          date: d.toISOString().split('T')[0],
          value: Math.round(value * 100) / 100,
          change: Math.round((dailyChange * 100) * 100) / 100
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          performance
        })
      };
    }

    // Health check
    if (httpMethod === 'GET' && path.includes('/health')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'OK',
          timestamp: new Date().toISOString(),
          message: 'Portfolio API is running successfully'
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Endpoint not found'
      })
    };

  } catch (error) {
    console.error('Portfolio function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};
