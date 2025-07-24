const express = require('express');
const yahooFinanceService = require('../services/yahooFinance');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const router = express.Router();
const jwt = require('jsonwebtoken');
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

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'), false);
    }
  }
});

// Upload portfolio file
router.post('/portfolio', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    let extractedData;

    if (fileType === 'application/pdf') {
      extractedData = await extractFromPDF(fileBuffer);
    } else if (fileType === 'text/csv') {
      extractedData = await extractFromCSV(fileBuffer);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      extractedData = await extractFromExcel(fileBuffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Process extracted data using RAG
    const processedPortfolio = await processPortfolioWithRAG(extractedData);

    if (!processedPortfolio || processedPortfolio.length === 0) {
      return res.status(400).json({ error: 'No stocks extracted from file. Please check your file format and contents.' });
    }

    // Update user's portfolio by calling batch-add endpoint
    try {
      // Directly require the batch-add handler if available, or use internal logic
      const portfolioRouter = require('./portfolio');
      // If you have a function to add batch, call it here
      if (portfolioRouter && typeof portfolioRouter.batchAddPortfolio === 'function') {
        await portfolioRouter.batchAddPortfolio(req.user.id, processedPortfolio);
      } else {
        // Fallback: make an internal HTTP request
        const axios = require('axios');
        await axios.post(
          `${req.protocol}://${req.get('host')}/api/portfolio/batch-add`,
          { userId: req.user.id, stocks: processedPortfolio },
          { headers: { Authorization: req.headers['authorization'] } }
        );
      }
    } catch (err) {
      console.error('Failed to update user portfolio:', err);
      // Optionally, you can return an error or continue
    }

    res.json({
      message: 'Portfolio uploaded, processed, and user portfolio updated successfully',
      extractedData: processedPortfolio,
      fileName: fileName
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// Extract data from PDF
async function extractFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text;
    // Use RAG to extract relevant portfolio information
    return await extractPortfolioFromText(text);
  } catch (error) {
    console.error('PDF parsing error:', error);
    // Try to process as TXT if PDF fails
    try {
      const text = buffer.toString('utf-8');
      return await extractPortfolioFromText(text);
    } catch (txtError) {
      console.error('TXT fallback parsing error:', txtError);
      throw new Error('Failed to parse PDF and TXT file. The file may be scanned, corrupted, or in an unsupported format. Please try a different file.');
    }
  }
}

// Extract data from CSV
async function extractFromCSV(buffer) {
  try {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const portfolio = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
          row[header.toLowerCase()] = values[index];
        });
        
        portfolio.push(row);
      }
    }
    
    return portfolio;
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error('Failed to parse CSV file');
  }
}

// Extract data from Excel (mock implementation)
async function extractFromExcel(buffer) {
  try {
    // In a real implementation, you would use a library like 'xlsx'
    // For now, we'll return mock data
    return [
      { symbol: 'AAPL', shares: '100', price: '150.25' },
      { symbol: 'GOOGL', shares: '50', price: '2750.50' },
      { symbol: 'MSFT', shares: '75', price: '310.75' }
    ];
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error('Failed to parse Excel file');
  }
}

// RAG-based portfolio extraction from text
async function extractPortfolioFromText(text) {
  try {
    // Use RAG pipeline (Python) to extract JSON from text
    const { spawnSync } = require('child_process');
    const pythonPath = 'python';
    const scriptPath = require('path').join(__dirname, '../../ml/rag_portfolio.py');
    // Write text to temp file
    const fs = require('fs');
    const tmpPath = require('path').join(__dirname, '../../ml/tmp_portfolio.txt');
    fs.writeFileSync(tmpPath, text, 'utf-8');
    // Run RAG pipeline
    const result = spawnSync(pythonPath, [scriptPath, tmpPath], { encoding: 'utf-8' });
    let jsonStr = result.stdout.trim();
    // Extract JSON object from output using regex
    const match = jsonStr.match(/({[\s\S]*})/);
    if (match) {
      jsonStr = match[1];
    }
    // Try to parse JSON
    let portfolio = [];
    try {
      let raw = JSON.parse(jsonStr);
      // If RAG output is an object with tickers as keys, convert to array
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        portfolio = await Promise.all(Object.values(raw).map(async item => {
          const symbol = item.ticker || item.symbol;
          const shares = item.shares;
          // Use the date from RAG output, fallback only if missing
          let purchaseDate = item.price_bought ? item.price_bought : new Date().toISOString();
          // Get current price for purchasePrice
          const purchasePrice = await getCurrentStockPrice(symbol);
          return {
            symbol,
            shares,
            purchasePrice,
            purchaseDate
          };
        }));
      } else if (Array.isArray(raw)) {
        portfolio = raw;
      }
    } catch (e) {
      console.error('RAG output not valid JSON:', jsonStr);
      portfolio = [];
    }
    // Fallback: if no price, use current price
    for (let item of portfolio) {
      if (!item.purchasePrice) {
        item.purchasePrice = await getCurrentStockPrice(item.symbol);
      }
      if (!item.purchaseDate) {
        item.purchaseDate = new Date().toISOString();
      }
    }
    return portfolio;
  } catch (error) {
    console.error('Portfolio extraction error:', error);
    throw new Error('Failed to extract portfolio data');
  }
}

// AI-based extraction using OpenAI (mock implementation)
async function extractWithAI(text) {
  try {
    // In a real implementation, you would use OpenAI's API
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     {
    //       role: "system",
    //       content: "Extract stock portfolio information from the following text. Return only valid stock symbols, number of shares, and purchase prices in JSON format."
    //     },
    //     {
    //       role: "user",
    //       content: text
    //     }
    //   ]
    // });
    
    // Mock AI response
    const mockResponse = [
      { symbol: 'AAPL', shares: 100, purchasePrice: 150.25 },
      { symbol: 'GOOGL', shares: 50, purchasePrice: 2750.50 },
      { symbol: 'MSFT', shares: 75, purchasePrice: 310.75 }
    ];
    
    return mockResponse;
  } catch (error) {
    console.error('AI extraction error:', error);
    throw new Error('Failed to extract data with AI');
  }
}

// Process portfolio with RAG
async function processPortfolioWithRAG(extractedData) {
  try {
    // Validate and clean extracted data
    const processedData = [];
    
    for (const item of extractedData) {
      if (item.symbol && item.shares && item.purchasePrice) {
        // Get current stock price
        const currentPrice = await getCurrentStockPrice(item.symbol);
        
        processedData.push({
          symbol: item.symbol.toUpperCase(),
          shares: parseFloat(item.shares),
          purchasePrice: parseFloat(item.purchasePrice),
          purchaseDate: item.purchaseDate || new Date().toISOString(),
          currentPrice: currentPrice,
          totalValue: parseFloat(item.shares) * currentPrice,
          gainLoss: (currentPrice - parseFloat(item.purchasePrice)) * parseFloat(item.shares),
          gainLossPercentage: ((currentPrice - parseFloat(item.purchasePrice)) / parseFloat(item.purchasePrice)) * 100
        });
      }
    }
    
    return processedData;
  } catch (error) {
    console.error('RAG processing error:', error);
    throw new Error('Failed to process portfolio data');
  }
}

// Helper function to get current stock price
async function getCurrentStockPrice(symbol) {
  // Use Yahoo Finance service for real-time price
  try {
    const quote = await yahooFinanceService.getStockQuote(symbol.toUpperCase());
    if (quote && quote.currentPrice) {
      return quote.currentPrice;
    }
    // Fallback: random price if API fails
    return Math.random() * 100 + 50;
  } catch (error) {
    console.error('Yahoo Finance price error:', error);
    return Math.random() * 100 + 50;
  }
}

module.exports = router; 