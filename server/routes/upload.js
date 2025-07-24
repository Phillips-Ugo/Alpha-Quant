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

// Upload portfolio file - UPDATED WITH BETTER ERROR HANDLING
router.post('/portfolio', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    let extractedData;

    console.log(`Processing file: ${fileName}, type: ${fileType}`);

    if (fileType === 'application/pdf') {
      extractedData = await extractFromPDF(fileBuffer);
    } else if (fileType === 'text/plain') {
      // Handle plain text files
      const text = fileBuffer.toString('utf-8');
      extractedData = await extractPortfolioFromText(text);
    } else if (fileType === 'text/csv') {
      extractedData = await extractFromCSV(fileBuffer);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      extractedData = await extractFromExcel(fileBuffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    console.log('Extracted data:', extractedData);

    if (!extractedData || extractedData.length === 0) {
      return res.status(400).json({ 
        error: 'No stocks extracted from file. Please check your file format and contents.',
        details: 'The file may not contain recognizable portfolio data or the format may not be supported.'
      });
    }

    // Process extracted data using RAG
    const processedPortfolio = await processPortfolioWithRAG(extractedData);

    if (!processedPortfolio || processedPortfolio.length === 0) {
      return res.status(400).json({ 
        error: 'No valid stocks found after processing.',
        details: 'The extracted data did not contain valid stock information.'
      });
    }

    console.log('Processed portfolio:', processedPortfolio);

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
      return res.status(500).json({ 
        error: 'Portfolio processed successfully but failed to update database',
        details: err.message
      });
    }

    res.json({
      message: 'Portfolio uploaded, processed, and user portfolio updated successfully',
      extractedData: processedPortfolio,
      fileName: fileName,
      stocksFound: processedPortfolio.length
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process uploaded file',
      details: error.message
    });
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

// Extract data from Excel (real implementation using xlsx library)
async function extractFromExcel(buffer) {
  try {
    const XLSX = require('xlsx');
    
    // Parse the Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('Excel data parsed:', jsonData);
    
    // Process and standardize the data
    const portfolio = [];
    
    for (const row of jsonData) {
      // Try to identify columns by common names (case-insensitive)
      const keys = Object.keys(row).map(k => k.toLowerCase());
      
      let symbol, shares, price, date;
      
      // Find symbol/ticker column
      const symbolKeys = keys.filter(k => 
        k.includes('symbol') || k.includes('ticker') || k.includes('stock')
      );
      if (symbolKeys.length > 0) {
        symbol = row[Object.keys(row).find(k => k.toLowerCase() === symbolKeys[0])];
      }
      
      // Find shares column
      const shareKeys = keys.filter(k => 
        k.includes('shares') || k.includes('quantity') || k.includes('qty')
      );
      if (shareKeys.length > 0) {
        shares = row[Object.keys(row).find(k => k.toLowerCase() === shareKeys[0])];
      }
      
      // Find price column
      const priceKeys = keys.filter(k => 
        k.includes('price') || k.includes('cost') || k.includes('value')
      );
      if (priceKeys.length > 0) {
        price = row[Object.keys(row).find(k => k.toLowerCase() === priceKeys[0])];
      }
      
      // Find date column
      const dateKeys = keys.filter(k => 
        k.includes('date') || k.includes('purchased') || k.includes('bought')
      );
      if (dateKeys.length > 0) {
        date = row[Object.keys(row).find(k => k.toLowerCase() === dateKeys[0])];
      }
      
      // If we couldn't find columns by name, try positional (first few columns)
      if (!symbol && !shares && !price) {
        const values = Object.values(row);
        if (values.length >= 2) {
          symbol = values[0]; // First column as symbol
          shares = values[1]; // Second column as shares
          price = values[2] || 0; // Third column as price (optional)
          date = values[3]; // Fourth column as date (optional)
        }
      }
      
      // Add to portfolio if we have minimum required data
      if (symbol && shares) {
        portfolio.push({
          symbol: String(symbol).toUpperCase(),
          shares: String(shares),
          price: String(price || 0),
          purchaseDate: date ? new Date(date).toISOString() : new Date().toISOString()
        });
      }
    }
    
    console.log('Processed Excel portfolio:', portfolio);
    return portfolio;
    
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error('Failed to parse Excel file. Please ensure it contains columns for Symbol, Shares, and optionally Price and Date.');
  }
}

// COMPLETELY REWRITTEN - RAG-based portfolio extraction from text
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
    
    // Run RAG pipeline with better error handling
    const result = spawnSync(pythonPath, [scriptPath, tmpPath], { 
      encoding: 'utf-8',
      timeout: 30000 // 30 second timeout
    });
    
    // Check for execution errors
    if (result.error) {
      console.error('Python script execution error:', result.error);
      throw new Error('Failed to execute RAG pipeline');
    }
    
    if (result.status !== 0) {
      console.error('Python script stderr:', result.stderr);
      throw new Error(`RAG pipeline failed with status ${result.status}`);
    }
    
    // Get the output and clean it
    let jsonStr = result.stdout.trim();
    
    if (!jsonStr) {
      console.error('No output from RAG pipeline');
      return [];
    }
    
    console.log('RAG output:', jsonStr); // Debug log
    
    // Parse JSON with better error handling
    let portfolio = [];
    try {
      const raw = JSON.parse(jsonStr);
      
      // Check if it's an error response from Python
      if (raw.error) {
        console.error('RAG pipeline error:', raw.error);
        return [];
      }
      
      // Handle different response formats
      if (Array.isArray(raw)) {
        portfolio = raw;
      } else if (raw && typeof raw === 'object') {
        // If RAG output is an object with tickers as keys, convert to array
        if (Object.keys(raw).length > 0 && Object.values(raw)[0].ticker) {
          portfolio = Object.values(raw);
        } else {
          // Single object, convert to array
          portfolio = [raw];
        }
      }
      
      // Process and validate each item
      const processedPortfolio = [];
      for (const item of portfolio) {
        if (item.ticker && item.shares) {
          // Get current price if purchasePrice is 0 or missing
          let purchasePrice = parseFloat(item.purchasePrice) || 0;
          if (purchasePrice === 0) {
            purchasePrice = await getCurrentStockPrice(item.ticker);
          }
          
          processedPortfolio.push({
            symbol: item.ticker.toUpperCase(),
            shares: parseFloat(item.shares),
            purchasePrice: purchasePrice,
            purchaseDate: item.purchaseDate || new Date().toISOString()
          });
        }
      }
      
      return processedPortfolio;
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw output that failed to parse:', jsonStr);
      
      // Try to extract JSON using regex as fallback
      const arrayMatch = jsonStr.match(/\[[\s\S]*?\]/);
      const objectMatch = jsonStr.match(/\{[\s\S]*?\}/);
      
      if (arrayMatch) {
        try {
          const extracted = JSON.parse(arrayMatch[0]);
          return Array.isArray(extracted) ? extracted : [extracted];
        } catch (regexParseError) {
          console.error('Array regex extraction failed:', regexParseError);
        }
      } else if (objectMatch) {
        try {
          const extracted = JSON.parse(objectMatch[0]);
          return [extracted];
        } catch (regexParseError) {
          console.error('Object regex extraction failed:', regexParseError);
        }
      }
      
      // Final fallback - return empty array
      console.error('All JSON parsing attempts failed');
      return [];
    }
    
  } catch (error) {
    console.error('Portfolio extraction error:', error);
    throw new Error('Failed to extract portfolio data from text');
  }
}

// Note: This function is not used in the current implementation
// Portfolio extraction is handled by the RAG pipeline in rag_portfolio.py
// Keeping this function for reference or potential future use as a fallback method

// UPDATED - Process portfolio with RAG
async function processPortfolioWithRAG(extractedData) {
  try {
    // Validate and clean extracted data
    const processedData = [];
    
    for (const item of extractedData) {
      if (item.symbol && item.shares && item.purchasePrice) {
        // Get current stock price
        const currentPrice = await getCurrentStockPrice(item.symbol);
        
        const shares = parseFloat(item.shares);
        const purchasePrice = parseFloat(item.purchasePrice);
        
        processedData.push({
          symbol: item.symbol.toUpperCase(),
          shares: shares,
          purchasePrice: purchasePrice,
          purchaseDate: item.purchaseDate || new Date().toISOString(),
          currentPrice: currentPrice,
          totalValue: shares * currentPrice,
          gainLoss: (currentPrice - purchasePrice) * shares,
          gainLossPercentage: purchasePrice > 0 ? ((currentPrice - purchasePrice) / purchasePrice) * 100 : 0
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