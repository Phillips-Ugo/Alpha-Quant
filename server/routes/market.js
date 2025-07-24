const express = require('express');
const router = express.Router();
const axios = require('axios');


const { spawn } = require('child_process');

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
    const indicators = await fetchYFinanceIndicators();
    res.json(indicators);
  } catch (error) {
    console.error('Market overview fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

module.exports = router;
