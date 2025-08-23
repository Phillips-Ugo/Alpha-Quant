const yahooFinance = require('yahoo-finance2').default;

// Extract portfolio data from CSV
async function extractFromCSV(fileBuffer) {
  try {
    const csvText = fileBuffer.toString('utf-8');
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredColumns = ['symbol', 'shares', 'purchase_price'];
    
    // Check if required columns exist
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const portfolio = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const symbol = row.symbol?.toUpperCase();
      const shares = parseFloat(row.shares);
      const purchasePrice = parseFloat(row.purchase_price);

      if (symbol && !isNaN(shares) && !isNaN(purchasePrice) && shares > 0 && purchasePrice > 0) {
        // Validate stock exists
        try {
          const quote = await yahooFinance.quote(symbol);
          portfolio.push({
            symbol: symbol,
            shares: shares,
            purchasePrice: purchasePrice,
            name: quote.longName || quote.shortName || symbol,
            purchaseDate: row.purchase_date || new Date().toISOString()
          });
        } catch (error) {
          console.warn(`Skipping invalid symbol: ${symbol}`);
        }
      }
    }

    return portfolio;
  } catch (error) {
    console.error('CSV extraction error:', error);
    throw error;
  }
}

// Extract portfolio data from text
async function extractPortfolioFromTextSimple(text) {
  try {
    const lines = text.split('\n').filter(line => line.trim());
    const portfolio = [];
    
    // Common patterns for stock data
    const patterns = [
      // Pattern: SYMBOL SHARES PRICE
      /([A-Z]{1,5})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g,
      // Pattern: SYMBOL - SHARES shares at $PRICE
      /([A-Z]{1,5})\s*-\s*(\d+(?:\.\d+)?)\s*shares?\s*at\s*\$?(\d+(?:\.\d+)?)/gi,
      // Pattern: SYMBOL: SHARES shares, $PRICE
      /([A-Z]{1,5}):\s*(\d+(?:\.\d+)?)\s*shares?,\s*\$?(\d+(?:\.\d+)?)/gi
    ];

    for (const line of lines) {
      for (const pattern of patterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          const symbol = match[1].toUpperCase();
          const shares = parseFloat(match[2]);
          const price = parseFloat(match[3]);

          if (symbol && !isNaN(shares) && !isNaN(price) && shares > 0 && price > 0) {
            try {
              const quote = await yahooFinance.quote(symbol);
              portfolio.push({
                symbol: symbol,
                shares: shares,
                purchasePrice: price,
                name: quote.longName || quote.shortName || symbol,
                purchaseDate: new Date().toISOString()
              });
            } catch (error) {
              console.warn(`Skipping invalid symbol: ${symbol}`);
            }
          }
        }
      }
    }

    return portfolio;
  } catch (error) {
    console.error('Text extraction error:', error);
    throw error;
  }
}

// Extract portfolio data from text using RAG (simplified version)
async function extractPortfolioFromText(text) {
  try {
    // This is a simplified RAG implementation
    // In a real implementation, you'd use a proper RAG pipeline
    
    const portfolio = await extractPortfolioFromTextSimple(text);
    
    // Additional processing could be added here
    // - Named entity recognition
    // - Context understanding
    // - Multiple format support
    
    return portfolio;
  } catch (error) {
    console.error('RAG extraction error:', error);
    throw error;
  }
}

// Process portfolio with RAG (simplified)
async function processPortfolioWithRAG(extractedData) {
  try {
    const processedPortfolio = [];
    
    for (const item of extractedData) {
      try {
        // Validate stock exists and get current data
        const quote = await yahooFinance.quote(item.symbol);
        
        processedPortfolio.push({
          id: Date.now().toString() + Math.floor(Math.random() * 10000) + item.symbol,
          symbol: item.symbol,
          shares: item.shares,
          purchasePrice: item.purchasePrice,
          name: quote.longName || quote.shortName || item.symbol,
          purchaseDate: item.purchaseDate || new Date().toISOString(),
          currentPrice: quote.regularMarketPrice,
          marketCap: quote.marketCap,
          pe: quote.trailingPE
        });
      } catch (error) {
        console.warn(`Failed to process ${item.symbol}:`, error.message);
      }
    }
    
    return processedPortfolio;
  } catch (error) {
    console.error('Portfolio processing error:', error);
    throw error;
  }
}

// Generate upload template
function generateUploadTemplate() {
  return {
    csv: {
      headers: ['symbol', 'shares', 'purchase_price', 'purchase_date'],
      example: [
        ['AAPL', '100', '150.00', '2024-01-15'],
        ['MSFT', '50', '300.00', '2024-01-20'],
        ['GOOGL', '25', '140.00', '2024-01-25']
      ],
      description: 'CSV file with columns: symbol, shares, purchase_price, purchase_date (optional)'
    },
    text: {
      formats: [
        'AAPL 100 150.00',
        'MSFT - 50 shares at $300.00',
        'GOOGL: 25 shares, $140.00'
      ],
      description: 'Plain text with stock symbol, shares, and purchase price'
    }
  };
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

    // Upload portfolio file
    if (httpMethod === 'POST' && path.includes('/upload')) {
      try {
        const data = JSON.parse(body);
        const { fileContent, fileName, fileType } = data;

        if (!fileContent || !fileName) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'File content and name are required'
            })
          });
        }

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(fileContent, 'base64');
        let extractedData;

        console.log(`Processing file: ${fileName}, type: ${fileType}`);

        try {
          if (fileType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
            extractedData = await extractFromCSV(fileBuffer);
          } else if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
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
          } else {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Unsupported file type. Please upload CSV or TXT files.'
              })
            };
          }
        } catch (extractError) {
          console.error('Extraction error:', extractError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Failed to extract portfolio data from file',
              details: extractError.message
            })
          };
        }

        console.log('Extracted data:', extractedData);

        if (!extractedData || extractedData.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'No stocks extracted from file. Please check your file format and contents.',
              details: 'The file may not contain recognizable portfolio data or the format may not be supported.'
            })
          };
        }

        // Process extracted data
        const processedPortfolio = await processPortfolioWithRAG(extractedData);

        if (!processedPortfolio || processedPortfolio.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'No valid stocks found after processing.',
              details: 'The extracted data did not contain valid stock information.'
            })
          };
        }

        console.log('Processed portfolio:', processedPortfolio);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Portfolio uploaded successfully',
            portfolio: processedPortfolio,
            summary: {
              totalStocks: processedPortfolio.length,
              totalShares: processedPortfolio.reduce((sum, stock) => sum + stock.shares, 0),
              totalValue: processedPortfolio.reduce((sum, stock) => sum + (stock.currentPrice * stock.shares), 0)
            }
          })
        });

      } catch (error) {
        console.error('Upload processing error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to process upload',
            details: error.message
          })
        };
      }
    }

    // Get upload templates
    if (httpMethod === 'GET' && path.includes('/template')) {
      const template = generateUploadTemplate();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          template
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
          message: 'Upload API is running successfully',
          supportedFormats: ['CSV', 'TXT']
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
    console.error('Upload function error:', error);
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
