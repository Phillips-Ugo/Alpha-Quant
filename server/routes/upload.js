const express = require('express');
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
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, CSV, and Excel files are allowed'), false);
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

    res.json({
      message: 'Portfolio uploaded and processed successfully',
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
    throw new Error('Failed to parse PDF file');
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
    // This is where you would implement RAG with OpenAI or similar
    // For now, we'll use a simple regex-based extraction
    
    const stockPattern = /([A-Z]{1,5})\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:shares?|@)?\s*\$?(\d+(?:\.\d+)?)/gi;
    const matches = [...text.matchAll(stockPattern)];
    
    const portfolio = [];
    
    matches.forEach(match => {
      const symbol = match[1];
      const shares = parseFloat(match[2]);
      const price = parseFloat(match[3]);
      
      if (symbol && shares && price) {
        portfolio.push({
          symbol: symbol.toUpperCase(),
          shares: shares,
          purchasePrice: price,
          purchaseDate: new Date().toISOString()
        });
      }
    });
    
    // If regex extraction fails, try AI-based extraction
    if (portfolio.length === 0) {
      return await extractWithAI(text);
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
  // Mock stock prices (replace with real API)
  const mockPrices = {
    'AAPL': 150.25,
    'GOOGL': 2750.50,
    'MSFT': 310.75,
    'AMZN': 3300.00,
    'TSLA': 850.25,
    'NVDA': 450.75,
    'META': 320.50,
    'NFLX': 580.25
  };
  
  return mockPrices[symbol.toUpperCase()] || Math.random() * 100 + 50;
}

module.exports = router; 