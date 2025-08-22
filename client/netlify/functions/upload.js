const yahooFinance = require('yahoo-finance2').default;

// Function to parse CSV content
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const stocks = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const stock = {};
    
    headers.forEach((header, index) => {
      stock[header.toLowerCase()] = values[index];
    });
    
    stocks.push(stock);
  }

  return stocks;
}

// Function to parse text content (simple format)
function parseText(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const stocks = [];

  for (const line of lines) {
    const parts = line.split(/\s+/).filter(part => part.trim());
    if (parts.length >= 2) {
      const symbol = parts[0].toUpperCase();
      const shares = parseFloat(parts[1]);
      
      if (symbol && !isNaN(shares)) {
        stocks.push({
          symbol,
          shares,
          purchasePrice: parts[2] ? parseFloat(parts[2]) : 0,
          purchaseDate: parts[3] || new Date().toISOString().split('T')[0]
        });
      }
    }
  }

  return stocks;
}

// Function to validate and enrich stock data
async function validateAndEnrichStocks(stocks) {
  const enrichedStocks = [];
  const errors = [];

  for (const stock of stocks) {
    try {
      // Validate required fields
      if (!stock.symbol || !stock.shares) {
        errors.push(`Missing required fields for stock: ${stock.symbol || 'Unknown'}`);
        continue;
      }

      // Get stock info from Yahoo Finance
      const quote = await yahooFinance.quote(stock.symbol);
      
      const enrichedStock = {
        id: Date.now().toString() + Math.floor(Math.random() * 10000) + stock.symbol,
        symbol: stock.symbol.toUpperCase(),
        name: quote.longName || quote.shortName || stock.symbol,
        shares: parseInt(stock.shares),
        purchasePrice: stock.purchasePrice || quote.regularMarketPrice || 0,
        purchaseDate: stock.purchaseDate || new Date().toISOString().split('T')[0],
        currentPrice: quote.regularMarketPrice,
        marketValue: (quote.regularMarketPrice * parseInt(stock.shares)),
        gainLoss: ((quote.regularMarketPrice - (stock.purchasePrice || quote.regularMarketPrice)) * parseInt(stock.shares)),
        gainLossPercent: stock.purchasePrice ? 
          (((quote.regularMarketPrice - stock.purchasePrice) / stock.purchasePrice) * 100) : 0
      };

      enrichedStocks.push(enrichedStock);

    } catch (error) {
      errors.push(`Failed to validate ${stock.symbol}: ${error.message}`);
    }
  }

  return { enrichedStocks, errors };
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
    const { path, httpMethod, body } = event;

    // Upload portfolio file
    if (httpMethod === 'POST' && path.includes('/upload')) {
      const data = JSON.parse(body);
      const { content, fileType, fileName } = data;

      if (!content) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'File content is required'
          })
        };
      }

      let stocks = [];
      let parseErrors = [];

      try {
        // Parse based on file type
        if (fileType === 'csv' || fileName?.toLowerCase().endsWith('.csv')) {
          stocks = parseCSV(content);
        } else if (fileType === 'txt' || fileName?.toLowerCase().endsWith('.txt')) {
          stocks = parseText(content);
        } else {
          // Try to auto-detect format
          if (content.includes(',')) {
            stocks = parseCSV(content);
          } else {
            stocks = parseText(content);
          }
        }

        if (stocks.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'No valid stock data found in file'
            })
          };
        }

      } catch (error) {
        parseErrors.push(`Failed to parse file: ${error.message}`);
      }

      // Validate and enrich stock data
      const { enrichedStocks, errors } = await validateAndEnrichStocks(stocks);
      const allErrors = [...parseErrors, ...errors];

      // Calculate portfolio summary
      const totalValue = enrichedStocks.reduce((sum, stock) => sum + stock.marketValue, 0);
      const totalGainLoss = enrichedStocks.reduce((sum, stock) => sum + stock.gainLoss, 0);
      const totalGainLossPercent = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            stocks: enrichedStocks,
            summary: {
              totalStocks: enrichedStocks.length,
              totalValue: Math.round(totalValue * 100) / 100,
              totalGainLoss: Math.round(totalGainLoss * 100) / 100,
              totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100
            },
            errors: allErrors,
            fileName: fileName || 'uploaded_file'
          }
        })
      };
    }

    // Get upload template
    if (httpMethod === 'GET' && path.includes('/template')) {
      const template = {
        csv: `Symbol,Shares,PurchasePrice,PurchaseDate
AAPL,50,175.50,2024-01-15
MSFT,40,320.25,2024-02-01
GOOGL,30,140.75,2024-01-20`,
        txt: `AAPL 50 175.50 2024-01-15
MSFT 40 320.25 2024-02-01
GOOGL 30 140.75 2024-01-20`,
        instructions: {
          csv: "Upload a CSV file with columns: Symbol, Shares, PurchasePrice (optional), PurchaseDate (optional)",
          txt: "Upload a text file with format: SYMBOL SHARES PURCHASE_PRICE(optional) PURCHASE_DATE(optional)"
        }
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: template
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
          message: 'Upload API is running successfully'
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
