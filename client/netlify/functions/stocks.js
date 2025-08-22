const yahooFinance = require('yahoo-finance2').default;

// Technical indicator calculations
function calculateSMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  return ema12 - ema26;
}

function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  
  let ema = prices[0];
  const multiplier = 2 / (period + 1);
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateVolatility(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
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

    // Advanced stock analysis with LSTM predictions
    if (httpMethod === 'POST' && path.includes('/analyze')) {
      const data = JSON.parse(body);
      const { ticker, daysAhead = 30 } = data;
      
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
        // Get basic quote and historical data
        const quote = await yahooFinance.quote(ticker);
        const history = await yahooFinance.historical(ticker, {
          period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
          period2: new Date(),
          interval: '1d'
        });

        // Get LSTM prediction
        const lstmResponse = await axios.post('/.netlify/functions/lstm-predict', {
          symbol: ticker,
          daysAhead: daysAhead
        });

        const prediction = lstmResponse.data.success ? lstmResponse.data.data : null;

        // Calculate technical indicators
        const prices = history.map(h => h.close);
        const volumes = history.map(h => h.volume);
        
        const sma20 = calculateSMA(prices, 20);
        const sma50 = calculateSMA(prices, 50);
        const rsi = calculateRSI(prices, 14);
        const macd = calculateMACD(prices);
        const volatility = calculateVolatility(prices);

        const currentPrice = quote.regularMarketPrice;
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const priceChange = currentPrice - avgPrice;
        const priceChangePercent = (priceChange / avgPrice) * 100;

        // Generate recommendation based on multiple factors
        let recommendation = 'HOLD';
        let confidence = 70;
        const factors = {
          technical: 0,
          fundamental: 0,
          sentiment: 0,
          prediction: 0
        };

        // Technical analysis (30% weight)
        if (sma20 > sma50 && rsi < 70) {
          factors.technical = 80;
          recommendation = 'BUY';
        } else if (sma20 < sma50 && rsi > 30) {
          factors.technical = 20;
          recommendation = 'SELL';
        } else {
          factors.technical = 50;
        }

        // Fundamental analysis (25% weight)
        if (quote.trailingPE && quote.trailingPE < 20) {
          factors.fundamental = 80;
        } else if (quote.trailingPE && quote.trailingPE > 30) {
          factors.fundamental = 30;
        } else {
          factors.fundamental = 60;
        }

        // Sentiment analysis (25% weight)
        if (priceChangePercent > 5) {
          factors.sentiment = 30; // Overbought
        } else if (priceChangePercent < -5) {
          factors.sentiment = 80; // Oversold
        } else {
          factors.sentiment = 60;
        }

        // LSTM prediction (20% weight)
        if (prediction) {
          factors.prediction = prediction.trend === 'bullish' ? 80 : 20;
          confidence = prediction.confidence * 100;
        }

        // Calculate overall confidence
        const overallScore = (
          factors.technical * 0.3 +
          factors.fundamental * 0.25 +
          factors.sentiment * 0.25 +
          factors.prediction * 0.2
        );
        confidence = Math.round(overallScore);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            analysis: {
              symbol: ticker,
              currentPrice: Math.round(currentPrice * 100) / 100,
              averagePrice: Math.round(avgPrice * 100) / 100,
              priceChange: Math.round(priceChange * 100) / 100,
              priceChangePercent: Math.round(priceChangePercent * 100) / 100,
              recommendation,
              confidence,
              factors,
              technicalIndicators: {
                sma20: Math.round(sma20 * 100) / 100,
                sma50: Math.round(sma50 * 100) / 100,
                rsi: Math.round(rsi * 100) / 100,
                macd: Math.round(macd * 100) / 100,
                volatility: Math.round(volatility * 100) / 100
              },
              prediction: prediction ? {
                predictedPrice: prediction.predictedPrice,
                predictedChangePercent: prediction.predictedChangePercent,
                trend: prediction.trend,
                model: prediction.model
              } : null,
              volume: quote.regularMarketVolume,
              marketCap: quote.marketCap,
              pe: quote.trailingPE,
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (error) {
        console.error('Analysis error:', error);
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
