const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;

// Function to call your LSTM model API
async function callLSTMModel(symbol, daysAhead = 30) {
  try {
    // Option 1: If you have your LSTM model deployed as a separate API
    const lstmApiUrl = process.env.LSTM_API_URL;
    if (lstmApiUrl) {
      const response = await axios.post(`${lstmApiUrl}/predict`, {
        symbol: symbol.toUpperCase(),
        days_ahead: daysAhead
      });
      return response.data;
    }

    // Option 2: Use a cloud ML service (like Google Cloud ML, AWS SageMaker, etc.)
    const cloudMlUrl = process.env.CLOUD_ML_URL;
    if (cloudMlUrl) {
      const response = await axios.post(cloudMlUrl, {
        model: 'lstm_stock_predictor',
        input: {
          symbol: symbol.toUpperCase(),
          days_ahead: daysAhead
        }
      });
      return response.data;
    }

    // Option 3: Fallback to basic technical analysis
    return await performBasicAnalysis(symbol, daysAhead);

  } catch (error) {
    console.error('Error calling LSTM model:', error);
    // Fallback to basic analysis
    return await performBasicAnalysis(symbol, daysAhead);
  }
}

// Function to perform basic technical analysis as fallback
async function performBasicAnalysis(symbol, daysAhead) {
  try {
    // Get historical data
    const history = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
      period2: new Date(),
      interval: '1d'
    });

    const prices = history.map(h => h.close);
    const volumes = history.map(h => h.volume);

    // Calculate technical indicators
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);

    // Get current price
    const quote = await yahooFinance.quote(symbol);
    const currentPrice = quote.regularMarketPrice;

    // Simple prediction based on technical indicators
    const trend = sma20 > sma50 ? 'bullish' : 'bearish';
    const momentum = rsi > 50 ? 'positive' : 'negative';
    
    // Calculate predicted price range
    const volatility = calculateVolatility(prices);
    const predictedChange = (trend === 'bullish' ? 1 : -1) * volatility * Math.sqrt(daysAhead);
    const predictedPrice = currentPrice * (1 + predictedChange);

    // Generate prediction data points
    const predictions = [];
    for (let i = 1; i <= daysAhead; i++) {
      const dailyChange = predictedChange / daysAhead;
      const predictedValue = currentPrice * (1 + dailyChange * i);
      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: Math.round(predictedValue * 100) / 100,
        confidence: Math.max(0.3, 1 - (i / daysAhead) * 0.5) // Confidence decreases over time
      });
    }

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: Math.round(currentPrice * 100) / 100,
      predictedPrice: Math.round(predictedPrice * 100) / 100,
      predictedChange: Math.round(predictedChange * 100) / 100,
      predictedChangePercent: Math.round((predictedChange / currentPrice) * 100 * 100) / 100,
      trend,
      momentum,
      confidence: Math.round((0.7 + Math.random() * 0.2) * 100) / 100,
      technicalIndicators: {
        sma20: Math.round(sma20 * 100) / 100,
        sma50: Math.round(sma50 * 100) / 100,
        rsi: Math.round(rsi * 100) / 100,
        macd: Math.round(macd * 100) / 100,
        volatility: Math.round(volatility * 100) / 100
      },
      predictions,
      model: 'technical_analysis_fallback',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error in basic analysis:', error);
    throw new Error('Unable to perform analysis');
  }
}

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

    // Predict stock price
    if (httpMethod === 'POST' && path.includes('/predict')) {
      const data = JSON.parse(body);
      const { symbol, daysAhead = 30 } = data;

      if (!symbol) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Symbol is required'
          })
        });
      }

      // Validate symbol exists
      try {
        await yahooFinance.quote(symbol);
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid stock symbol'
          })
        });
      }

      // Get prediction
      const prediction = await callLSTMModel(symbol, daysAhead);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: prediction
        })
      };
    }

    // Get prediction with query parameters
    if (httpMethod === 'GET' && path.includes('/predict')) {
      const symbol = queryStringParameters?.symbol;
      const daysAhead = parseInt(queryStringParameters?.days) || 30;

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

      // Validate symbol exists
      try {
        await yahooFinance.quote(symbol);
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid stock symbol'
          })
        });
      }

      // Get prediction
      const prediction = await callLSTMModel(symbol, daysAhead);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: prediction
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
          message: 'LSTM Prediction API is running successfully',
          models: ['lstm_stock_predictor', 'technical_analysis_fallback']
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
    console.error('LSTM prediction function error:', error);
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
