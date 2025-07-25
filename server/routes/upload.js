const express = require('express');
const yahooFinanceService = require('../services/yahooFinance');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, CSV, and Excel files are allowed'), false);
    }
  }
});

// Upload portfolio file - UPDATED WITH BETTER ERROR HANDLING
router.post('/portfolio', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    let extractedData;

    console.log(`Processing file: ${fileName}, type: ${fileType}`);

    try {
      if (fileType === 'application/pdf') {
        extractedData = await extractFromPDF(fileBuffer);
      } else if (fileType === 'text/plain') {
        const text = fileBuffer.toString('utf-8');
        // Try RAG pipeline first for text files
        try {
          console.log('Attempting RAG extraction for text file...');
          extractedData = await extractPortfolioFromText(text);
          if (extractedData && extractedData.length > 0) {
            console.log('RAG extraction succeeded for text file');
          } else {
            console.log('RAG extraction returned empty results, trying simple extraction');
            extractedData = await extractPortfolioFromTextSimple(text);
          }
        } catch (ragError) {
          console.log('RAG failed for text file, falling back to simple extraction:', ragError.message);
          extractedData = await extractPortfolioFromTextSimple(text);
        }
      } else if (fileType === 'text/csv') {
        extractedData = await extractFromCSV(fileBuffer);
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 fileType === 'application/vnd.ms-excel') {
        extractedData = await extractFromExcel(fileBuffer);
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }
    } catch (extractError) {
      console.error('Extraction error:', extractError);
      return res.status(400).json({
        error: 'Failed to extract portfolio data from file',
        details: extractError.message
      });
    }

    console.log('Extracted data:', extractedData);

    if (!extractedData || extractedData.length === 0) {
      return res.status(400).json({ 
        error: 'No stocks extracted from file. Please check your file format and contents.',
        details: 'The file may not contain recognizable portfolio data or the format may not be supported.'
      });
    }

    // Process extracted data
    const processedPortfolio = await processPortfolioWithRAG(extractedData);

    if (!processedPortfolio || processedPortfolio.length === 0) {
      return res.status(400).json({ 
        error: 'No valid stocks found after processing.',
        details: 'The extracted data did not contain valid stock information.'
      });
    }

    console.log('Processed portfolio:', processedPortfolio);

    // Save the processed portfolio to the user's portfolio using batch-add
    try {
      // Get portfolio storage from portfolio route
      const portfolioRoute = require('./portfolio');
      
      // Add portfolio data to the user's portfolio (using default user since authentication was removed)
      const userId = 'default-user';
      
      // Get existing portfolios object from portfolio route
      const fs = require('fs');
      const path = require('path');
      const portfolioDataPath = path.join(__dirname, '../data/portfolios.json');
      
      let portfolios = {};
      try {
        if (fs.existsSync(portfolioDataPath)) {
          portfolios = JSON.parse(fs.readFileSync(portfolioDataPath, 'utf8'));
        }
      } catch (err) {
        console.log('No existing portfolio data found, starting fresh');
      }
      
      // Initialize user portfolio if not exists
      if (!portfolios[userId]) {
        portfolios[userId] = [];
      }
      
      // Add new stocks to portfolio (avoiding duplicates)
      for (const stock of processedPortfolio) {
        // Add unique ID for frontend operations
        const stockWithId = {
          ...stock,
          id: Date.now().toString() + Math.floor(Math.random() * 10000)
        };
        portfolios[userId].push(stockWithId);
      }
      
      // Save updated portfolios
      const dataDir = path.dirname(portfolioDataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(portfolioDataPath, JSON.stringify(portfolios, null, 2));
      
      console.log(`Added ${processedPortfolio.length} stocks to user ${userId}'s portfolio`);
      
    } catch (portfolioError) {
      console.error('Error saving to portfolio:', portfolioError);
      // Don't fail the upload if portfolio save fails
    }

    res.json({
      message: 'Portfolio uploaded and processed successfully',
      extractedData: processedPortfolio,
      fileName: fileName,
      stocksFound: processedPortfolio.length,
      saved: true // Indicate that data was saved to portfolio
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
    
    if (!text || text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no extractable text');
    }
    
    console.log('Extracted PDF text length:', text.length);
    console.log('PDF text preview:', text.substring(0, 200));
    
    // Try RAG pipeline first - this is the primary method
    try {
      console.log('Attempting RAG extraction for PDF...');
      const ragExtraction = await extractPortfolioFromText(text);
      if (ragExtraction && ragExtraction.length > 0) {
        console.log('RAG extraction succeeded for PDF:', ragExtraction);
        return ragExtraction;
      } else {
        console.log('RAG extraction returned empty results, trying simple extraction');
      }
    } catch (ragError) {
      console.log('RAG extraction failed for PDF:', ragError.message);
    }
    
    // Fall back to simple extraction if RAG fails or returns empty
    const simpleExtraction = await extractPortfolioFromTextSimple(text);
    if (simpleExtraction && simpleExtraction.length > 0) {
      console.log('Simple extraction succeeded for PDF:', simpleExtraction);
      return simpleExtraction;
    }
    
    // Return simple extraction results even if empty - better than throwing error
    console.log('Returning simple extraction results (may be empty):', simpleExtraction);
    return simpleExtraction;
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Try to process as plain text if PDF parsing fails
    try {
      const text = buffer.toString('utf-8');
      console.log('Trying as plain text, length:', text.length);
      
      if (text.trim().length === 0) {
        throw new Error('File appears to be empty');
      }
      
      // Try RAG first on plain text too
      try {
        console.log('Attempting RAG extraction on plain text fallback...');
        const ragExtraction = await extractPortfolioFromText(text);
        if (ragExtraction && ragExtraction.length > 0) {
          return ragExtraction;
        }
      } catch (ragError) {
        console.log('RAG extraction failed on plain text fallback:', ragError.message);
      }
      
      // Final fallback to simple extraction
      const simpleExtraction = await extractPortfolioFromTextSimple(text);
      return simpleExtraction; // Return even if empty
      
    } catch (txtError) {
      console.error('Text fallback parsing error:', txtError);
      throw new Error('Failed to parse file. The file may be corrupted, password-protected, or in an unsupported format. Please try a plain text file or check that your PDF contains selectable text.');
    }
  }
}

// Extract data from CSV
async function extractFromCSV(buffer) {
  try {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const portfolio = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        console.warn(`Row ${i} has ${values.length} values but ${headers.length} headers, skipping`);
        continue;
      }
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      // Try to extract symbol and shares
      let symbol = row.symbol || row.ticker || row.stock;
      let shares = row.shares || row.quantity || row.qty;
      let price = row.price || row.cost || row.value || 0;
      
      if (symbol && shares) {
        portfolio.push({
          symbol: symbol.toUpperCase(),
          shares: parseFloat(shares),
          purchasePrice: parseFloat(price) || 0,
          purchaseDate: new Date().toISOString()
        });
      }
    }
    
    return portfolio;
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error('Failed to parse CSV file: ' + error.message);
  }
}

// Extract data from Excel
async function extractFromExcel(buffer) {
  try {
    const XLSX = require('xlsx');
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('Excel data parsed:', jsonData);
    
    const portfolio = [];
    
    for (const row of jsonData) {
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
          symbol = values[0];
          shares = values[1];
          price = values[2] || 0;
          date = values[3];
        }
      }
      
      // Add to portfolio if we have minimum required data
      if (symbol && shares) {
        portfolio.push({
          symbol: String(symbol).toUpperCase(),
          shares: parseFloat(shares),
          purchasePrice: parseFloat(price) || 0,
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

// Simple text-based portfolio extraction as fallback
async function extractPortfolioFromTextSimple(text) {
  try {
    console.log('Using simple text extraction');
    const portfolio = [];
    
    const lines = text.split('\n');
    
    // Look for patterns like:
    // AAPL 100 shares
    // MSFT: 50 shares at $150
    // TSLA - 25 shares, $800 per share
    
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length < 3) continue;
      
      // Pattern 1: TICKER shares_number
      const pattern1 = /([A-Z]{1,5})\s+(\d+(?:\.\d+)?)\s*(?:shares?|sh)/i;
      const match1 = cleanLine.match(pattern1);
      
      if (match1) {
        const symbol = match1[1];
        const shares = parseFloat(match1[2]);
        
        // Look for price in the same line
        const pricePattern = /\$?(\d+(?:\.\d+)?)/g;
        const priceMatches = [...cleanLine.matchAll(pricePattern)];
        let price = 0;
        
        for (const priceMatch of priceMatches) {
          const potentialPrice = parseFloat(priceMatch[1]);
          if (potentialPrice !== shares && potentialPrice > 0) {
            price = potentialPrice;
            break;
          }
        }
        
        portfolio.push({
          symbol: symbol.toUpperCase(),
          shares: shares,
          purchasePrice: price || 0,
          purchaseDate: new Date().toISOString()
        });
        continue;
      }
      
      // Pattern 2: TICKER: number shares
      const pattern2 = /([A-Z]{1,5})\s*[:,-]\s*(\d+(?:\.\d+)?)\s*(?:shares?|sh)/i;
      const match2 = cleanLine.match(pattern2);
      
      if (match2) {
        const symbol = match2[1];
        const shares = parseFloat(match2[2]);
        
        portfolio.push({
          symbol: symbol.toUpperCase(),
          shares: shares,
          purchasePrice: 0,
          purchaseDate: new Date().toISOString()
        });
        continue;
      }
      
      // Pattern 3: Just look for tickers and assume next number is shares
      const tickerRegex = /\b[A-Z]{1,5}\b/g;
      const tickers = cleanLine.match(tickerRegex);
      if (tickers && tickers.length > 0) {
        const ticker = tickers[0];
        const numbers = cleanLine.match(/\d+(?:\.\d+)?/g);
        
        if (numbers && numbers.length > 0) {
          const shares = parseFloat(numbers[0]);
          if (shares > 0 && shares < 100000) { // Reasonable share count
            portfolio.push({
              symbol: ticker.toUpperCase(),
              shares: shares,
              purchasePrice: 0,
              purchaseDate: new Date().toISOString()
            });
          }
        }
      }
    }
    
    // Remove duplicates
    const uniquePortfolio = [];
    const seen = new Set();
    
    for (const item of portfolio) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        uniquePortfolio.push(item);
      }
    }
    
    console.log('Simple extraction found:', uniquePortfolio);
    return uniquePortfolio;
    
  } catch (error) {
    console.error('Simple extraction error:', error);
    return [];
  }
}

// RAG-based portfolio extraction from text (with error handling)
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
      throw new Error('Failed to execute RAG pipeline - Python not available or script error');
    }
    
    if (result.status !== 0) {
      console.error('Python script stderr:', result.stderr);
      throw new Error(`RAG pipeline failed with status ${result.status}: ${result.stderr}`);
    }
    
    // Get the output and clean it
    let jsonStr = result.stdout.trim();
    
    if (!jsonStr) {
      console.error('No output from RAG pipeline');
      throw new Error('RAG pipeline returned no output');
    }
    
    console.log('RAG output:', jsonStr);
    
    // Parse JSON with better error handling
    let portfolio = [];
    try {
      const raw = JSON.parse(jsonStr);
      
      // Check if it's an error response from Python
      if (raw.error) {
        console.error('RAG pipeline error:', raw.error);
        throw new Error('RAG pipeline returned error: ' + raw.error);
      }
      
      // Handle different response formats
      if (Array.isArray(raw)) {
        portfolio = raw;
      } else if (raw && typeof raw === 'object') {
        if (Object.keys(raw).length > 0 && Object.values(raw)[0].ticker) {
          portfolio = Object.values(raw);
        } else {
          portfolio = [raw];
        }
      }
      
      // Process and validate each item
      const processedPortfolio = [];
      for (const item of portfolio) {
        if (item.ticker && item.shares) {
          processedPortfolio.push({
            symbol: item.ticker.toUpperCase(),
            shares: parseFloat(item.shares),
            purchasePrice: parseFloat(item.purchasePrice) || 0,
            purchaseDate: item.purchaseDate || new Date().toISOString()
          });
        }
      }
      
      return processedPortfolio;
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw output that failed to parse:', jsonStr);
      throw new Error('Failed to parse RAG output as JSON');
    }
    
  } catch (error) {
    console.error('Portfolio extraction error:', error);
    throw new Error('Failed to extract portfolio data using RAG: ' + error.message);
  }
}

// Process portfolio data
async function processPortfolioWithRAG(extractedData) {
  try {
    const processedData = [];
    
    console.log('Processing extracted data:', extractedData);
    
    for (const item of extractedData) {
      if (item.symbol && item.shares) {
        const cleanSymbol = item.symbol.toUpperCase().trim();
        
        // Validate symbol before processing
        if (!isValidStockSymbol(cleanSymbol)) {
          console.warn(`Skipping invalid symbol: ${item.symbol}`);
          continue;
        }
        
        // Get current stock price if purchase price is 0
        let purchasePrice = parseFloat(item.purchasePrice) || 0;
        if (purchasePrice === 0) {
          try {
            purchasePrice = await getCurrentStockPrice(cleanSymbol);
          } catch (priceError) {
            console.warn(`Failed to get price for ${cleanSymbol}, using default`);
            purchasePrice = 100; // Default fallback price
          }
        }
        
        const shares = parseFloat(item.shares);
        
        // Get current price with error handling
        let currentPrice;
        try {
          currentPrice = await getCurrentStockPrice(cleanSymbol);
        } catch (priceError) {
          console.warn(`Failed to get current price for ${cleanSymbol}, using purchase price`);
          currentPrice = purchasePrice;
        }
        
        processedData.push({
          symbol: cleanSymbol,
          shares: shares,
          purchasePrice: purchasePrice,
          purchaseDate: item.purchaseDate || new Date().toISOString(),
          currentPrice: currentPrice,
          totalValue: shares * currentPrice,
          gainLoss: (currentPrice - purchasePrice) * shares,
          gainLossPercentage: purchasePrice > 0 ? ((currentPrice - purchasePrice) / purchasePrice) * 100 : 0
        });
        
        console.log(`Processed ${cleanSymbol}: ${shares} shares at $${currentPrice}`);
      }
    }
    
    console.log(`Successfully processed ${processedData.length} stocks`);
    return processedData;
  } catch (error) {
    console.error('RAG processing error:', error);
    throw new Error('Failed to process portfolio data: ' + error.message);
  }
}

// Helper function to validate stock symbol format
function isValidStockSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return false;
  
  // Basic symbol validation: 1-5 characters, letters only, uppercase
  const symbolRegex = /^[A-Z]{1,5}$/;
  return symbolRegex.test(symbol.toUpperCase());
}

// Helper function to get current stock price
async function getCurrentStockPrice(symbol) {
  try {
    // Validate symbol format first
    const cleanSymbol = symbol.toUpperCase().trim();
    if (!isValidStockSymbol(cleanSymbol)) {
      console.warn(`Invalid symbol format: ${symbol}`);
      return 100; // Default fallback price for invalid symbols
    }

    console.log(`Fetching price for symbol: ${cleanSymbol}`);
    const quote = await yahooFinanceService.getStockQuote(cleanSymbol);
    
    if (quote && quote.error) {
      console.warn(`Yahoo Finance returned error for ${cleanSymbol}:`, quote.error);
      return 100; // Default fallback price
    }
    
    if (quote && quote.currentPrice && quote.currentPrice > 0) {
      console.log(`Found price for ${cleanSymbol}: $${quote.currentPrice}`);
      return quote.currentPrice;
    }
    
    // Fallback: default price if API succeeds but no price found
    console.warn(`No valid price found for ${cleanSymbol}, using default`);
    return 100;
  } catch (error) {
    console.error(`Yahoo Finance price error for ${symbol}:`, error.message);
    return 100; // Default fallback price
  }
}

module.exports = router;
