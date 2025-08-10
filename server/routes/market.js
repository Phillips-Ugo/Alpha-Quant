const express = require('express');
const router = express.Router();
const axios = require('axios');

const { spawn } = require('child_process');

// Cache for market overview data
let marketOverviewCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Helper to fetch indicators using yfinance via Python
async function fetchYFinanceIndicators() {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [__dirname + '/../../ml/yfinance_indicators.py']);
    let data = '';
    let error = '';
    py.stdout.on('data', (chunk) => { data += chunk; });
    py.stderr.on('data', (chunk) => { error += chunk; });
    py.on('close', (code) => {
      if (code !== 0 || error) {
        reject(error || 'Python process failed');
      } else {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject('Failed to parse Python output');
        }
      }
    });
  });
}

router.get('/market-overview', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (marketOverviewCache && (now - lastFetchTime) < CACHE_DURATION) {
      return res.json(marketOverviewCache);
    }

    console.log('🌍 Fetching market overview (cache miss)');
    const indicators = await fetchYFinanceIndicators();
    
    // Update cache
    marketOverviewCache = indicators;
    lastFetchTime = now;
    
    res.json(indicators);
  } catch (error) {
    console.error('Market overview fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

module.exports = router;
