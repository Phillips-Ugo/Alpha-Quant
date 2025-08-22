const yahooFinance = require('yahoo-finance2').default;

// Function to check if market is open
function isMarketOpen() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Market is closed on weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Market hours: 9:30 AM - 4:00 PM ET (Eastern Time)
  // For simplicity, we'll use UTC and assume market is open during business hours
  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
  const marketCloseMinutes = 16 * 60; // 4:00 PM

  return timeInMinutes >= marketOpenMinutes && timeInMinutes < marketCloseMinutes;
}

// Function to get market status
function getMarketStatus() {
  const open = isMarketOpen();
  const now = new Date();
  
  return {
    isOpen: open,
    status: open ? 'OPEN' : 'CLOSED',
    timestamp: now.toISOString(),
    nextOpen: open ? null : getNextMarketOpen(),
    timeUntilOpen: open ? null : getTimeUntilOpen()
  };
}

// Function to get next market open time
function getNextMarketOpen() {
  const now = new Date();
  const nextOpen = new Date(now);
  
  // If it's weekend, move to Monday
  if (now.getDay() === 0) { // Sunday
    nextOpen.setDate(now.getDate() + 1);
  } else if (now.getDay() === 6) { // Saturday
    nextOpen.setDate(now.getDate() + 2);
  } else if (now.getHours() >= 16) { // After 4 PM
    nextOpen.setDate(now.getDate() + 1);
  }
  
  nextOpen.setHours(9, 30, 0, 0);
  return nextOpen.toISOString();
}

// Function to get time until market opens
function getTimeUntilOpen() {
  const now = new Date();
  const nextOpen = new Date(getNextMarketOpen());
  const diffMs = nextOpen - now;
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
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
    const { path, httpMethod } = event;

    // Get market status
    if (httpMethod === 'GET' && path.includes('/market/status')) {
      const marketStatus = getMarketStatus();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: marketStatus
        })
      };
    }

    // Get market overview with major indices
    if (httpMethod === 'GET' && path.includes('/market/overview')) {
      try {
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
                volume: quote.regularMarketVolume
              };
            } catch (error) {
              console.error(`Error fetching ${index}:`, error);
              return null;
            }
          })
        );

        const validQuotes = quotes.filter(quote => quote !== null);
        const marketStatus = getMarketStatus();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              status: marketStatus,
              indices: {
                sp500: validQuotes.find(q => q.symbol === '^GSPC'),
                nasdaq: validQuotes.find(q => q.symbol === '^IXIC'),
                dowJones: validQuotes.find(q => q.symbol === '^DJI'),
                russell2000: validQuotes.find(q => q.symbol === '^RUT')
              }
            }
          })
        });
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch market data'
          })
        });
      }
    }

    // Get market sectors performance
    if (httpMethod === 'GET' && path.includes('/market/sectors')) {
      const sectors = [
        { symbol: 'XLK', name: 'Technology' },
        { symbol: 'XLF', name: 'Financial' },
        { symbol: 'XLE', name: 'Energy' },
        { symbol: 'XLV', name: 'Healthcare' },
        { symbol: 'XLI', name: 'Industrial' },
        { symbol: 'XLP', name: 'Consumer Staples' },
        { symbol: 'XLY', name: 'Consumer Discretionary' },
        { symbol: 'XLU', name: 'Utilities' },
        { symbol: 'XLB', name: 'Materials' },
        { symbol: 'XLRE', name: 'Real Estate' }
      ];

      try {
        const sectorData = await Promise.all(
          sectors.map(async (sector) => {
            try {
              const quote = await yahooFinance.quote(sector.symbol);
              return {
                name: sector.name,
                symbol: sector.symbol,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent
              };
            } catch (error) {
              return null;
            }
          })
        );

        const validSectors = sectorData.filter(sector => sector !== null);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: validSectors
          })
        });
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch sector data'
          })
        });
      }
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

// Helper function to get index names
function getIndexName(symbol) {
  const names = {
    '^GSPC': 'S&P 500',
    '^IXIC': 'NASDAQ Composite',
    '^DJI': 'Dow Jones Industrial Average',
    '^RUT': 'Russell 2000'
  };
  return names[symbol] || symbol;
}
