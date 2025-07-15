const express = require('express');
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

// In-memory chat history (replace with database in production)
let chatHistory = {};

// Get chat history
router.get('/chat', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const userChatHistory = chatHistory[userId] || [];
    
    res.json({ messages: userChatHistory });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Send message to AI
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message, portfolioContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize chat history for user if it doesn't exist
    if (!chatHistory[userId]) {
      chatHistory[userId] = [];
    }

    // Add user message to history
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    chatHistory[userId].push(userMessage);

    // Generate AI response
    const aiResponse = await generateAIResponse(message, portfolioContext, chatHistory[userId]);

    // Add AI response to history
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };

    chatHistory[userId].push(aiMessage);

    // Keep only last 50 messages to prevent memory issues
    if (chatHistory[userId].length > 50) {
      chatHistory[userId] = chatHistory[userId].slice(-50);
    }

    res.json({
      message: 'Message sent successfully',
      response: aiResponse,
      chatHistory: chatHistory[userId]
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Clear chat history
router.delete('/chat', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    chatHistory[userId] = [];
    
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// Generate AI response
async function generateAIResponse(message, portfolioContext, chatHistory) {
  try {
    // In a real implementation, you would use OpenAI's API
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Prepare context for the AI
    const context = buildContext(portfolioContext, chatHistory);
    
    // Mock AI response based on message content
    const response = await generateMockResponse(message, context);
    
    return response;
  } catch (error) {
    console.error('AI response generation error:', error);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
  }
}

// Build context for AI
function buildContext(portfolioContext, chatHistory) {
  let context = "You are a knowledgeable financial advisor AI assistant. ";
  
  if (portfolioContext && portfolioContext.portfolio) {
    context += `The user's current portfolio includes: `;
    portfolioContext.portfolio.forEach(stock => {
      context += `${stock.symbol} (${stock.shares} shares at $${stock.purchasePrice}), `;
    });
    context += `Total portfolio value: $${portfolioContext.totalValue}. `;
  }
  
  context += "Provide helpful, accurate, and educational financial advice. Always remind users that you are not providing financial advice and they should consult with a professional financial advisor for investment decisions.";
  
  return context;
}

// Generate mock AI response
async function generateMockResponse(message, context) {
  const lowerMessage = message.toLowerCase();
  
  // Portfolio analysis
  if (lowerMessage.includes('portfolio') || lowerMessage.includes('holdings')) {
    return "Based on your portfolio, I can see you have a diversified mix of technology and consumer stocks. Your portfolio shows a good balance of growth and value stocks. Remember to regularly review your asset allocation and consider rebalancing if needed.";
  }
  
  // Stock recommendations
  if (lowerMessage.includes('recommend') || lowerMessage.includes('buy') || lowerMessage.includes('sell')) {
    return "I can't provide specific buy or sell recommendations as I'm not a licensed financial advisor. However, I can help you understand market trends and analyze company fundamentals. Consider consulting with a professional financial advisor for personalized investment advice.";
  }
  
  // Market analysis
  if (lowerMessage.includes('market') || lowerMessage.includes('trend')) {
    return "The current market shows mixed signals with technology stocks experiencing volatility due to interest rate concerns. It's important to focus on your long-term investment goals and maintain a diversified portfolio. Market timing is extremely difficult, so consider dollar-cost averaging for new investments.";
  }
  
  // Risk management
  if (lowerMessage.includes('risk') || lowerMessage.includes('volatility')) {
    return "Risk management is crucial for long-term investment success. Consider diversifying across different sectors, asset classes, and geographic regions. Also, ensure you have an emergency fund before investing. Remember, past performance doesn't guarantee future results.";
  }
  
  // General financial advice
  if (lowerMessage.includes('invest') || lowerMessage.includes('money')) {
    return "Successful investing requires patience, discipline, and a long-term perspective. Start by defining your financial goals, understanding your risk tolerance, and creating a diversified portfolio. Consider low-cost index funds as a foundation for your portfolio.";
  }
  
  // Technical analysis
  if (lowerMessage.includes('technical') || lowerMessage.includes('chart')) {
    return "Technical analysis can be a useful tool for understanding market sentiment, but it should be used in conjunction with fundamental analysis. Remember that technical indicators are not foolproof and should be part of a broader investment strategy.";
  }
  
  // Default response
  return "I'm here to help you with your financial questions! I can assist with portfolio analysis, market insights, and general financial education. What specific aspect of investing would you like to learn more about?";
}

// Get AI insights for portfolio
router.post('/insights', authenticateToken, async (req, res) => {
  try {
    const { portfolio } = req.body;
    
    if (!portfolio || !Array.isArray(portfolio)) {
      return res.status(400).json({ error: 'Portfolio data is required' });
    }

    const insights = await generatePortfolioInsights(portfolio);
    
    res.json({
      insights: insights
    });

  } catch (error) {
    console.error('Portfolio insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Generate portfolio insights
async function generatePortfolioInsights(portfolio) {
  try {
    const insights = {
      diversification: analyzeDiversification(portfolio),
      riskAssessment: analyzeRisk(portfolio),
      performanceAnalysis: analyzePerformance(portfolio),
      recommendations: generateRecommendations(portfolio)
    };
    
    return insights;
  } catch (error) {
    console.error('Insights generation error:', error);
    throw new Error('Failed to generate insights');
  }
}

// Analyze portfolio diversification
function analyzeDiversification(portfolio) {
  const sectors = {};
  let totalValue = 0;
  
  portfolio.forEach(stock => {
    const sector = getStockSector(stock.symbol);
    sectors[sector] = (sectors[sector] || 0) + stock.totalValue;
    totalValue += stock.totalValue;
  });
  
  const sectorWeights = Object.keys(sectors).map(sector => ({
    sector,
    weight: (sectors[sector] / totalValue) * 100
  }));
  
  const concentrationRisk = sectorWeights.some(sw => sw.weight > 30);
  
  return {
    sectorBreakdown: sectorWeights,
    concentrationRisk,
    recommendation: concentrationRisk ? 
      "Consider diversifying across more sectors to reduce concentration risk." :
      "Your portfolio shows good sector diversification."
  };
}

// Analyze portfolio risk
function analyzeRisk(portfolio) {
  const totalValue = portfolio.reduce((sum, stock) => sum + stock.totalValue, 0);
  const totalGainLoss = portfolio.reduce((sum, stock) => sum + stock.gainLoss, 0);
  const volatility = calculateVolatility(portfolio);
  
  return {
    totalValue,
    totalGainLoss,
    volatility,
    riskLevel: volatility > 20 ? 'High' : volatility > 10 ? 'Medium' : 'Low',
    recommendation: volatility > 20 ? 
      "Consider adding more stable, dividend-paying stocks to reduce volatility." :
      "Your portfolio shows reasonable risk levels."
  };
}

// Analyze portfolio performance
function analyzePerformance(portfolio) {
  const totalInvested = portfolio.reduce((sum, stock) => sum + (stock.shares * stock.purchasePrice), 0);
  const totalGainLoss = portfolio.reduce((sum, stock) => sum + stock.gainLoss, 0);
  const performance = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  
  const topPerformers = portfolio
    .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
    .slice(0, 3);
  
  const underPerformers = portfolio
    .sort((a, b) => a.gainLossPercentage - b.gainLossPercentage)
    .slice(0, 3);
  
  return {
    totalPerformance: performance,
    topPerformers,
    underPerformers,
    recommendation: performance > 0 ? 
      "Your portfolio is performing well. Consider taking some profits on top performers." :
      "Focus on your long-term investment strategy and consider dollar-cost averaging."
  };
}

// Generate recommendations
function generateRecommendations(portfolio) {
  const recommendations = [];
  
  if (portfolio.length < 5) {
    recommendations.push("Consider adding more stocks to improve diversification.");
  }
  
  const techStocks = portfolio.filter(stock => getStockSector(stock.symbol) === 'Technology');
  if (techStocks.length > portfolio.length * 0.4) {
    recommendations.push("Your portfolio is heavily weighted in technology. Consider adding stocks from other sectors.");
  }
  
  const dividendStocks = portfolio.filter(stock => stock.currentPrice > 100); // Mock dividend check
  if (dividendStocks.length < portfolio.length * 0.3) {
    recommendations.push("Consider adding more dividend-paying stocks for income generation.");
  }
  
  return recommendations;
}

// Helper functions
function getStockSector(symbol) {
  const sectorMap = {
    'AAPL': 'Technology',
    'GOOGL': 'Technology',
    'MSFT': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'NVDA': 'Technology',
    'META': 'Technology',
    'NFLX': 'Communication Services'
  };
  
  return sectorMap[symbol.toUpperCase()] || 'Unknown';
}

function calculateVolatility(portfolio) {
  // Mock volatility calculation
  return Math.random() * 30 + 5; // 5-35% range
}

module.exports = router; 