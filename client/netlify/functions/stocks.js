const yahooFinance = require('yahoo-finance2').default;

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

    // Health check endpoint
    if (path.endsWith('/health')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'OK',
          timestamp: new Date().toISOString(),
          message: 'Stock API is running successfully'
        })
      };
    }

    // Get stock quote
    if (httpMethod === 'GET' && path.includes('/quote')) {
      const symbol = queryStringParameters?.symbol;
      
      if (!symbol) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Symbol parameter is required'
          })
        };
      }

      try {
        const quote = await yahooFinance.quote(symbol);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              symbol: quote.symbol,
              name: quote.longName || quote.shortName,
              price: quote.regularMarketPrice,
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
            }
          })
        };
      } catch (error) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Stock not found'
          })
        };
      }
    }

    // Search stocks
    if (httpMethod === 'GET' && path.includes('/search')) {
      const query = queryStringParameters?.q;
      
      if (!query) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Query parameter is required'
          })
        });
      }

      try {
        const searchResults = await yahooFinance.search(query);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: searchResults.slice(0, 10) // Limit to 10 results
          })
        });
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Search failed'
          })
        });
      }
    }

    // Get historical data
    if (httpMethod === 'GET' && path.includes('/history')) {
      const symbol = queryStringParameters?.symbol;
      const period = queryStringParameters?.period || '1mo';
      
      if (!symbol) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Symbol parameter is required'
          })
        });
      }

      try {
        const history = await yahooFinance.historical(symbol, {
          period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          period2: new Date(),
          interval: '1d'
        });
        
        const formattedHistory = history.map(item => ({
          date: item.date.toISOString().split('T')[0],
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: formattedHistory
          })
        });
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch historical data'
          })
        });
      }
    }

    // Get market overview (major indices)
    if (httpMethod === 'GET' && path.includes('/market-overview')) {
      try {
        const indices = ['^GSPC', '^IXIC', '^DJI', '^RUT']; // S&P 500, NASDAQ, DOW, Russell 2000
        const quotes = await Promise.all(
          indices.map(async (index) => {
            try {
              const quote = await yahooFinance.quote(index);
              return {
                symbol: quote.symbol,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent
              };
            } catch (error) {
              return null;
            }
          })
        );

        const validQuotes = quotes.filter(quote => quote !== null);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            indices: {
              sp500: validQuotes.find(q => q.symbol === '^GSPC'),
              nasdaq: validQuotes.find(q => q.symbol === '^IXIC'),
              dowJones: validQuotes.find(q => q.symbol === '^DJI'),
              russell2000: validQuotes.find(q => q.symbol === '^RUT')
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

    // Basic stock analysis (without ML for now)
    if (httpMethod === 'POST' && path.includes('/analyze')) {
      const data = JSON.parse(body);
      const { ticker } = data;
      
      if (!ticker) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Ticker symbol is required'
          })
        });
      }

      try {
        const quote = await yahooFinance.quote(ticker);
        const history = await yahooFinance.historical(ticker, {
          period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          period2: new Date(),
          interval: '1d'
        });

        // Basic technical analysis
        const prices = history.map(h => h.close);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const currentPrice = quote.regularMarketPrice;
        const priceChange = currentPrice - avgPrice;
        const priceChangePercent = (priceChange / avgPrice) * 100;

        // Simple recommendation based on price vs average
        let recommendation = 'HOLD';
        if (priceChangePercent > 5) {
          recommendation = 'SELL';
        } else if (priceChangePercent < -5) {
          recommendation = 'BUY';
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            analysis: {
              symbol: ticker,
              currentPrice,
              averagePrice: Math.round(avgPrice * 100) / 100,
              priceChange: Math.round(priceChange * 100) / 100,
              priceChangePercent: Math.round(priceChangePercent * 100) / 100,
              recommendation,
              confidence: Math.random() * 30 + 70, // Mock confidence score
              factors: {
                technical: Math.random() * 100,
                fundamental: Math.random() * 100,
                sentiment: Math.random() * 100
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
            error: 'Analysis failed'
          })
        });
      }
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
    console.error('Stocks function error:', error);
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
