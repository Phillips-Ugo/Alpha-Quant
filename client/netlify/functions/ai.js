const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;

// Function to get real market data for AI responses
async function getMarketData() {
  try {
    const indices = ['^GSPC', '^IXIC', '^DJI'];
    const quotes = await Promise.all(
      indices.map(async (index) => {
        try {
          const quote = await yahooFinance.quote(index);
          return {
            symbol: quote.symbol,
            name: getIndexName(quote.symbol),
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent
          };
        } catch (error) {
          return null;
        }
      })
    );

    return quotes.filter(quote => quote !== null);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return [];
  }
}

// Function to get stock analysis
async function getStockAnalysis(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    const history = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d'
    });

    const prices = history.map(h => h.close);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const currentPrice = quote.regularMarketPrice;
    const priceChange = currentPrice - avgPrice;
    const priceChangePercent = (priceChange / avgPrice) * 100;

    // Calculate technical indicators
    const volatility = calculateVolatility(prices);
    const trend = calculateTrend(prices);
    const support = Math.min(...prices.slice(-10));
    const resistance = Math.max(...prices.slice(-10));

    return {
      symbol,
      currentPrice,
      averagePrice: Math.round(avgPrice * 100) / 100,
      priceChange: Math.round(priceChange * 100) / 100,
      priceChangePercent: Math.round(priceChangePercent * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      trend,
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      pe: quote.trailingPE
    };
  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error);
    return null;
  }
}

// Function to calculate volatility
function calculateVolatility(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

// Function to calculate trend
function calculateTrend(prices) {
  const recent = prices.slice(-5);
  const older = prices.slice(-10, -5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  if (recentAvg > olderAvg * 1.02) return 'bullish';
  if (recentAvg < olderAvg * 0.98) return 'bearish';
  return 'neutral';
}

// Function to get portfolio insights
async function getPortfolioInsights(portfolio) {
  if (!portfolio || portfolio.length === 0) {
    return {
      totalValue: 0,
      totalGainLoss: 0,
      topPerformers: [],
      recommendations: ['Consider adding some stocks to your portfolio to get started.']
    };
  }

  try {
    const symbols = portfolio.map(stock => stock.symbol);
    const quotes = await yahooFinance.quote(symbols);
    
    let totalValue = 0;
    let totalCost = 0;
    const stockAnalytics = [];

    portfolio.forEach(stock => {
      const quote = Array.isArray(quotes) ? quotes.find(q => q.symbol === stock.symbol) : quotes;
      const currentPrice = quote?.regularMarketPrice || stock.purchasePrice;
      const currentValue = currentPrice * stock.shares;
      const costBasis = stock.purchasePrice * stock.shares;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = ((gainLoss / costBasis) * 100);

      totalValue += currentValue;
      totalCost += costBasis;

      stockAnalytics.push({
        ...stock,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent
      });
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

    // Get top performers
    const topPerformers = stockAnalytics
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 3);

    // Generate recommendations
    const recommendations = [];
    if (totalGainLossPercent > 10) {
      recommendations.push('Your portfolio is performing well! Consider taking some profits on your top performers.');
    } else if (totalGainLossPercent < -10) {
      recommendations.push('Your portfolio is down significantly. Consider dollar-cost averaging to lower your average cost.');
    } else {
      recommendations.push('Your portfolio is stable. Consider diversifying into different sectors.');
    }

    if (portfolio.length < 5) {
      recommendations.push('Consider adding more stocks to improve diversification.');
    }

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      totalGainLoss: Math.round(totalGainLoss * 100) / 100,
      totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100,
      topPerformers,
      recommendations
    };

  } catch (error) {
    console.error('Error calculating portfolio insights:', error);
    return {
      totalValue: 0,
      totalGainLoss: 0,
      topPerformers: [],
      recommendations: ['Unable to analyze portfolio at this time.']
    };
  }
}

// Function to generate contextual AI response
async function generateAIResponse(userInput, conversationHistory = []) {
  const input = userInput.toLowerCase();
  
  // Portfolio analysis
  if (input.includes('portfolio') || input.includes('holdings') || input.includes('investments')) {
    const insights = await getPortfolioInsights([]); // You'd pass actual portfolio data here
    return `Here's an analysis of your portfolio:\n\n` +
           `• Total Value: $${insights.totalValue.toLocaleString()}\n` +
           `• Total Gain/Loss: $${insights.totalGainLoss.toLocaleString()} (${insights.totalGainLossPercent}%)\n\n` +
           `Recommendations:\n${insights.recommendations.map(rec => `• ${rec}`).join('\n')}\n\n` +
           `Would you like me to analyze specific stocks or provide rebalancing suggestions?`;
  }

  // Stock analysis
  if (input.includes('analyze') || input.includes('stock') || input.includes('price')) {
    const stockMentions = userInput.match(/\b[A-Z]{1,5}\b/g);
    if (stockMentions && stockMentions.length > 0) {
      const symbol = stockMentions[0];
      const analysis = await getStockAnalysis(symbol);
      
      if (analysis) {
        return `Analysis for ${symbol}:\n\n` +
               `• Current Price: $${analysis.currentPrice}\n` +
               `• 30-Day Average: $${analysis.averagePrice}\n` +
               `• Change: $${analysis.priceChange} (${analysis.priceChangePercent}%)\n` +
               `• Trend: ${analysis.trend}\n` +
               `• Volatility: ${analysis.volatility}%\n` +
               `• Support: $${analysis.support}\n` +
               `• Resistance: $${analysis.resistance}\n\n` +
               `Based on this analysis, ${analysis.priceChangePercent > 5 ? 'consider taking profits' : 
                analysis.priceChangePercent < -5 ? 'this might be a good entry point' : 
                'the stock appears to be trading within normal ranges'}.`;
      }
    }
    return `I can analyze any stock for you. Just mention the ticker symbol (like AAPL, MSFT, etc.) and I'll provide a detailed analysis.`;
  }

  // Market overview
  if (input.includes('market') || input.includes('economy') || input.includes('indices')) {
    const marketData = await getMarketData();
    if (marketData.length > 0) {
      let response = `Current Market Overview:\n\n`;
      marketData.forEach(index => {
        const changeIcon = index.changePercent >= 0 ? '📈' : '📉';
        response += `${changeIcon} ${index.name}: $${index.price.toLocaleString()} ` +
                   `(${index.changePercent >= 0 ? '+' : ''}${index.changePercent.toFixed(2)}%)\n`;
      });
      
      const overallTrend = marketData.reduce((sum, index) => sum + index.changePercent, 0) / marketData.length;
      response += `\nOverall market trend: ${overallTrend > 0 ? 'Bullish' : 'Bearish'}\n\n`;
      response += `Would you like specific sector analysis or market timing insights?`;
      
      return response;
    }
  }

  // News and sentiment
  if (input.includes('news') || input.includes('earnings') || input.includes('announcement')) {
    return `I can help you with the latest financial news and earnings announcements. ` +
           `You can check the News section for real-time updates, or ask me about specific companies. ` +
           `Would you like me to analyze how recent news might impact your investments?`;
  }

  // Investment advice
  if (input.includes('buy') || input.includes('sell') || input.includes('recommend')) {
    return `I can provide analysis to help inform your investment decisions, but remember that I'm not a financial advisor. ` +
           `Always do your own research and consider consulting with a professional. ` +
           `What specific stock or sector are you interested in?`;
  }

  // Default response
  return `Hello! I'm your AI financial assistant. I can help you with:\n\n` +
         `• Portfolio analysis and performance tracking\n` +
         `• Real-time stock analysis and technical indicators\n` +
         `• Market trends and economic insights\n` +
         `• News analysis and sentiment assessment\n` +
         `• Investment research and recommendations\n\n` +
         `What would you like to know about today?`;
}

// Helper function to get index names
function getIndexName(symbol) {
  const names = {
    '^GSPC': 'S&P 500',
    '^IXIC': 'NASDAQ',
    '^DJI': 'Dow Jones'
  };
  return names[symbol] || symbol;
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

    // Chat endpoint
    if (httpMethod === 'POST' && path.endsWith('/chat')) {
      const data = JSON.parse(body);
      const { message, conversationHistory = [] } = data;

      if (!message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Message is required'
          })
        });
      }

      // Generate AI response using real data
      const aiResponse = await generateAIResponse(message, conversationHistory);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            response: aiResponse,
            timestamp: new Date().toISOString(),
            messageId: Date.now().toString(),
            suggestions: [
              "Analyze my portfolio performance",
              "What's the market outlook today?",
              "Analyze AAPL stock for me",
              "Show me the latest financial news"
            ]
          }
        })
      };
    }

    // Get market overview
    if (httpMethod === 'GET' && path.includes('/market-overview')) {
      const marketData = await getMarketData();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            indices: marketData,
            timestamp: new Date().toISOString()
          }
        })
      };
    }

    // Get stock analysis
    if (httpMethod === 'GET' && path.includes('/stock-analysis')) {
      const symbol = event.queryStringParameters?.symbol;
      
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

      const analysis = await getStockAnalysis(symbol);
      
      if (!analysis) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Stock not found or analysis failed'
          })
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: analysis
        })
      };
    }

    // Get chat suggestions
    if (httpMethod === 'GET' && path.includes('/suggestions')) {
      const suggestions = [
        "How is my portfolio performing?",
        "What's the market outlook for today?",
        "Analyze AAPL stock for me",
        "What are the latest market trends?",
        "Help me understand my investment performance",
        "What stocks should I research?",
        "How do I diversify my portfolio?",
        "What's the impact of recent news on stocks?"
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: suggestions
        })
      };
    }

    // Get AI capabilities
    if (httpMethod === 'GET' && path.includes('/capabilities')) {
      const capabilities = {
        portfolioAnalysis: {
          description: "Real-time portfolio performance analysis and recommendations",
          features: ["Performance tracking", "Gain/loss analysis", "Diversification insights", "Rebalancing suggestions"]
        },
        stockAnalysis: {
          description: "Comprehensive stock research with technical indicators",
          features: ["Price analysis", "Technical indicators", "Trend analysis", "Support/resistance levels"]
        },
        marketInsights: {
          description: "Real-time market data and economic analysis",
          features: ["Market indices", "Sector performance", "Economic indicators", "Market trends"]
        },
        newsAnalysis: {
          description: "Financial news integration and sentiment analysis",
          features: ["Real-time news", "Sentiment analysis", "Impact assessment", "Trend identification"]
        }
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: capabilities
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
          message: 'AI Chat API is running successfully'
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
    console.error('AI function error:', error);
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
