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

// Health check endpoint - add this first
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Stock API is running successfully'
  });
});

// Route to analyze a specific stock with ML prediction
router.post('/analyze', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { ticker, daysAhead = 30, newsText } = req.body;
    
    if (!ticker) {
      return res.status(400).json({ 
        error: 'Ticker symbol is required', 
        success: false 
      });
    }

    console.log(`🔍 Starting analysis for ${ticker} (${daysAhead} days ahead)`);

    // Validate Python script exists
    const pythonScriptPath = path.join(__dirname, '../../ml/lstm_pipeline.py');
    if (!require('fs').existsSync(pythonScriptPath)) {
      console.error(`Python script not found at: ${pythonScriptPath}`);
      return res.status(500).json({
        error: 'ML pipeline script not found',
        success: false,
        details: `Expected script at: ${pythonScriptPath}`
      });
    }

    // Spawn Python process with proper error handling
    const pythonArgs = [
      pythonScriptPath, 
      '--predict', 
      '--days', 
      daysAhead.toString(), 
      ticker.toUpperCase()
    ];

    console.log(`🐍 Executing: python ${pythonArgs.join(' ')}`);
    
    const pythonProcess = spawn('python', pythonArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
    
    let result = '';
    let error = '';
    let isProcessRunning = true;

    // Set up data collectors
    pythonProcess.stdout.on('data', (data) => { 
      result += data.toString(); 
    });
    
    pythonProcess.stderr.on('data', (data) => { 
      error += data.toString();
      console.log(`Python stderr: ${data.toString()}`);
    });

    // Handle process completion
    pythonProcess.on('close', async (code) => {
      isProcessRunning = false;
      const duration = Date.now() - startTime;
      
      try {
        console.log(`🐍 Python process finished with code ${code} in ${duration}ms`);
        console.log(`Python stdout length: ${result.length}`);
        console.log(`Python stderr length: ${error.length}`);

        // Check for training needed
        if (error.includes('Model not found') || error.includes('Train first')) {
          console.log(`🏋️ Model needs training for ${ticker}`);
          
          // Start training process (async)
          const trainArgs = [
            pythonScriptPath, 
            '--train', 
            '--days', 
            daysAhead.toString(), 
            ticker.toUpperCase()
          ];
          
          const trainProcess = spawn('python', trainArgs);
          trainProcess.on('close', (trainCode) => {
            console.log(`Training process completed with code ${trainCode} for ${ticker}`);
          });
          
          return res.status(202).json({ 
            message: 'Model is being trained. Please try again in a few minutes.', 
            success: false, 
            training: true,
            ticker: ticker.toUpperCase(),
            estimatedWaitTime: '2-3 minutes'
          });
        }

        // Check for process failure
        if (code !== 0) {
          console.error(`❌ Python process failed with code ${code}`);
          console.error(`Error output: ${error}`);
          console.error(`Stdout output: ${result}`);
          
          return res.status(500).json({ 
            error: 'Analysis process failed', 
            details: error || 'Unknown Python error',
            stdout: result,
            exitCode: code,
            success: false 
          });
        }

        // Parse results
        if (!result.trim()) {
          console.error('No output from Python script');
          return res.status(500).json({
            error: 'No output from analysis script',
            stderr: error,
            success: false
          });
        }

        let stockData = null;
        try {
          stockData = JSON.parse(result.trim());
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          console.error('Raw output:', result);
          
          return res.status(500).json({ 
            error: 'Invalid response from analysis script', 
            parseError: parseError.message, 
            rawOutput: result.substring(0, 500),
            success: false 
          });
        }

        // Check if the parsed data indicates an error
        if (!stockData.success && stockData.error) {
          console.error('Python script returned error:', stockData.error);
          return res.status(400).json({
            error: stockData.error,
            success: false,
            ticker: ticker.toUpperCase()
          });
        }

        // Sentiment analysis (optional)
        let sentimentResult = null;
        if (newsText && newsText.trim()) {
          try {
            console.log('🧠 Running sentiment analysis...');
            const axios = require('axios');
            const sentimentRes = await axios.post('http://localhost:8000/sentiment', { 
              text: newsText 
            }, { timeout: 5000 });
            sentimentResult = sentimentRes.data;
          } catch (sentimentErr) {
            console.warn('Sentiment analysis failed:', sentimentErr.message);
            sentimentResult = { 
              error: 'Sentiment analysis service unavailable'
            };
          }
        }

        // Combine results
        const finalResult = { 
          ...stockData, 
          sentiment: sentimentResult?.sentiment, 
          sentimentScore: sentimentResult?.score,
          processingTime: duration,
          success: true 
        };

        console.log(`✅ Analysis completed for ${ticker} in ${duration}ms`);
        res.json(finalResult);

      } catch (err) {
        console.error('❌ Unexpected error in analysis route:', err);
        res.status(500).json({ 
          error: 'Unexpected server error', 
          details: err.message, 
          success: false 
        });
      }
    });

    // Handle process errors
    pythonProcess.on('error', (err) => {
      if (isProcessRunning) {
        isProcessRunning = false;
        console.error('❌ Failed to start Python process:', err);
        res.status(500).json({ 
          error: 'Failed to start analysis process', 
          details: err.message, 
          success: false 
        });
      }
    });

    // Set timeout for the process
    setTimeout(() => {
      if (isProcessRunning) {
        console.warn(`⏰ Python process timeout for ${ticker}`);
        pythonProcess.kill('SIGTERM');
        res.status(408).json({
          error: 'Analysis timeout',
          message: 'The analysis is taking longer than expected. Please try again.',
          success: false
        });
      }
    }, 120000); // 2 minute timeout

  } catch (error) {
    console.error('❌ Stock analysis error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message, 
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

    console.log(`📊 Fetching data for: ${ticker}`);

    const stockData = await yahooFinanceService.getStockQuote(ticker.toUpperCase());

    res.json({
      ...stockData,
      success: true
    });

  } catch (error) {
    console.error('Stock data fetch error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch stock data',  
      success: false,
      ticker: req.params.ticker
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

    console.log(`📈 Fetching statistics for: ${ticker}`);

    const statistics = await yahooFinanceService.getStockStatistics(ticker.toUpperCase());
    
    res.json({
      ...statistics,
      success: true
    });

  } catch (error) {
    console.error('Statistics generation error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      success: false,
      ticker: req.params.ticker
    });
  }
});

// Route to get market overview
router.get('/market-overview', async (req, res) => {
  try {
    console.log('🌍 Fetching market overview');
    
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

    if (query.length < 1) {
      return res.status(400).json({ 
        error: 'Search query too short',
        success: false 
      });
    }

    console.log(`🔎 Searching stocks: ${query}`);

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

    console.log(`📅 Fetching history for: ${ticker} (${period})`);

    const history = await yahooFinanceService.getHistoricalData(
      ticker.toUpperCase(), 
      period, 
      interval
    );
    
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

// Authenticated routes
router.get('/quote/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`💰 Fetching authenticated quote for: ${symbol}`);
    
    const quote = await yahooFinanceService.getStockQuote(symbol.toUpperCase());
    res.json({
      ...quote,
      success: true
    });
  } catch (error) {
    console.error('Get stock quote error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock quote',
      success: false 
    });
  }
});

router.post('/quotes', authenticateToken, async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ 
        error: 'Symbols array is required',
        success: false 
      });
    }
    
    console.log(`💰 Fetching quotes for: ${symbols.join(', ')}`);
    
    const quotes = await Promise.all(
      symbols.map(symbol => yahooFinanceService.getStockQuote(symbol.toUpperCase()))
    );
    
    res.json({ 
      quotes,
      success: true 
    });
  } catch (error) {
    console.error('Get multiple quotes error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock quotes',
      success: false 
    });
  }
});

// Error handling middleware for this router
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    success: false
  });
});

module.exports = router;