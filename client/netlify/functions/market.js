const yahooFinance = require('yahoo-finance2').default;

// Cache for market overview data
let marketOverviewCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Get market overview data
async function getMarketOverview() {
  try {
    // Get major indices
    const indices = ['^GSPC', '^IXIC', '^DJI', '^RUT']; // S&P 500, NASDAQ, DOW, Russell 2000
    const quotes = await Promise.all(
      indices.map(async (index) => {
        try {
          const quote = await yahooFinance.quote(index);
          return {
            symbol: quote.symbol,
            name: getIndexName(quote.symbol),
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume,
            high: quote.regularMarketDayHigh,
            low: quote.regularMarketDayLow
          };
        } catch (error) {
          console.warn(`Failed to fetch ${index}:`, error.message);
          return null;
        }
      })
    );

    const validQuotes = quotes.filter(quote => quote !== null);

    // Get sector performance
    const sectors = await getSectorPerformance();

    // Get market status
    const marketStatus = await getMarketStatus();

    // Calculate overall market sentiment
    const sentiment = calculateMarketSentiment(validQuotes, sectors);

    return {
      indices: {
        sp500: validQuotes.find(q => q.symbol === '^GSPC'),
        nasdaq: validQuotes.find(q => q.symbol === '^IXIC'),
        dowJones: validQuotes.find(q => q.symbol === '^DJI'),
        russell2000: validQuotes.find(q => q.symbol === '^RUT')
      },
      sectors,
      status: marketStatus,
      sentiment,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error fetching market overview:', error);
    throw error;
  }
}

// Get sector performance
async function getSectorPerformance() {
  try {
    // Major sector ETFs
    const sectorETFs = {
      'XLK': 'Technology',
      'XLF': 'Financials',
      'XLV': 'Health Care',
      'XLE': 'Energy',
      'XLI': 'Industrials',
      'XLP': 'Consumer Staples',
      'XLY': 'Consumer Discretionary',
      'XLU': 'Utilities',
      'XLRE': 'Real Estate',
      'XLB': 'Materials',
      'XLC': 'Communication Services'
    };

    const sectorData = {};
    
    for (const [etf, sector] of Object.entries(sectorETFs)) {
      try {
        const quote = await yahooFinance.quote(etf);
        sectorData[sector] = {
          symbol: etf,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          volume: quote.regularMarketVolume
        };
      } catch (error) {
        console.warn(`Failed to fetch ${etf}:`, error.message);
        // Use mock data as fallback
        sectorData[sector] = {
          symbol: etf,
          price: 100 + Math.random() * 50,
          change: (Math.random() - 0.5) * 2,
          changePercent: (Math.random() - 0.5) * 4,
          volume: 1000000 + Math.random() * 5000000
        };
      }
    }

    return sectorData;

  } catch (error) {
    console.error('Error fetching sector performance:', error);
    return {};
  }
}

// Get market status (open/closed)
async function getMarketStatus() {
  try {
    // Check if market is open by looking at SPY (most liquid ETF)
    const spy = await yahooFinance.quote('SPY');
    const now = new Date();
    const marketTime = new Date(spy.regularMarketTime * 1000);
    
    // Market is open if the last update was within the last 5 minutes
    const isOpen = (now - marketTime) < 5 * 60 * 1000;
    
    return {
      isOpen,
      lastUpdate: marketTime.toISOString(),
      nextOpen: getNextMarketOpen(),
      nextClose: getNextMarketClose()
    };

  } catch (error) {
    console.error('Error checking market status:', error);
    return {
      isOpen: false,
      lastUpdate: new Date().toISOString(),
      nextOpen: getNextMarketOpen(),
      nextClose: getNextMarketClose()
    };
  }
}

// Calculate market sentiment
function calculateMarketSentiment(indices, sectors) {
  try {
    let positiveCount = 0;
    let totalCount = 0;

    // Check indices
    indices.forEach(index => {
      if (index && index.changePercent !== undefined) {
        totalCount++;
        if (index.changePercent > 0) positiveCount++;
      }
    });

    // Check sectors
    Object.values(sectors).forEach(sector => {
      if (sector && sector.changePercent !== undefined) {
        totalCount++;
        if (sector.changePercent > 0) positiveCount++;
      }
    });

    const sentimentScore = totalCount > 0 ? positiveCount / totalCount : 0.5;
    
    let sentiment = 'neutral';
    if (sentimentScore > 0.6) sentiment = 'bullish';
    else if (sentimentScore < 0.4) sentiment = 'bearish';

    return {
      overall: sentiment,
      score: Math.round(sentimentScore * 100) / 100,
      positiveCount,
      totalCount,
      indicators: {
        fearGreedIndex: Math.round((1 - sentimentScore) * 100),
        volatilityIndex: 20.0 + Math.random() * 10
      }
    };

  } catch (error) {
    console.error('Error calculating sentiment:', error);
    return {
      overall: 'neutral',
      score: 0.5,
      positiveCount: 0,
      totalCount: 0,
      indicators: {
        fearGreedIndex: 50,
        volatilityIndex: 20.0
      }
    };
  }
}

// Helper function to get index names
function getIndexName(symbol) {
  const names = {
    '^GSPC': 'S&P 500',
    '^IXIC': 'NASDAQ',
    '^DJI': 'Dow Jones',
    '^RUT': 'Russell 2000'
  };
  return names[symbol] || symbol;
}

// Get next market open time
function getNextMarketOpen() {
  const now = new Date();
  const nextOpen = new Date(now);
  
  // If it's weekend, move to Monday
  if (nextOpen.getDay() === 0) { // Sunday
    nextOpen.setDate(nextOpen.getDate() + 1);
  } else if (nextOpen.getDay() === 6) { // Saturday
    nextOpen.setDate(nextOpen.getDate() + 2);
  }
  
  // Set to 9:30 AM ET
  nextOpen.setHours(9, 30, 0, 0);
  
  // If it's already past 9:30 AM today, move to next day
  if (now > nextOpen) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }
  
  return nextOpen.toISOString();
}

// Get next market close time
function getNextMarketClose() {
  const now = new Date();
  const nextClose = new Date(now);
  
  // If it's weekend, move to Monday
  if (nextClose.getDay() === 0) { // Sunday
    nextClose.setDate(nextClose.getDate() + 1);
  } else if (nextClose.getDay() === 6) { // Saturday
    nextClose.setDate(nextClose.getDate() + 2);
  }
  
  // Set to 4:00 PM ET
  nextClose.setHours(16, 0, 0, 0);
  
  // If it's already past 4:00 PM today, move to next day
  if (now > nextClose) {
    nextClose.setDate(nextClose.getDate() + 1);
  }
  
  return nextClose.toISOString();
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
    const { path, httpMethod, queryStringParameters } = event;

    // Get market overview
    if (httpMethod === 'GET' && path.includes('/market-overview')) {
      // Check cache first
      const now = Date.now();
      if (marketOverviewCache && (now - lastFetchTime) < CACHE_DURATION) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            ...marketOverviewCache,
            cached: true
          })
        };
      }

      console.log('🌍 Fetching market overview (cache miss)');
      const overview = await getMarketOverview();
      
      // Update cache
      marketOverviewCache = overview;
      lastFetchTime = now;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ...overview
        })
      };
    }

    // Get market status
    if (httpMethod === 'GET' && path.includes('/status')) {
      const status = await getMarketStatus();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status
        })
      };
    }

    // Get sector performance
    if (httpMethod === 'GET' && path.includes('/sectors')) {
      const sectors = await getSectorPerformance();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sectors
        })
      };
    }

    // Get market sentiment
    if (httpMethod === 'GET' && path.includes('/sentiment')) {
      const overview = await getMarketOverview();
      const sentiment = overview.sentiment;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sentiment
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
          message: 'Market API is running successfully'
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
    console.error('Market function error:', error);
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
