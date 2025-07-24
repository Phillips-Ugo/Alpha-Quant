const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Added missing axios import

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

// Generate AI response - OpenAI DIRECT VERSION
async function generateAIResponse(message, portfolioContext, userChatHistory) {
  try {
    // Use environment variable for API key ONLY
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build a broad context including portfolio and chat history
    let context = "You are a knowledgeable financial advisor AI assistant. ";
    if (portfolioContext && portfolioContext.portfolio && portfolioContext.portfolio.length > 0) {
      context += `The user's current portfolio includes: `;
      portfolioContext.portfolio.forEach(stock => {
        const gainLoss = stock.gainLoss || 0;
        const gainLossPercent = stock.gainLossPercentage || 0;
        context += `${stock.symbol} (${stock.shares} shares at $${stock.purchasePrice}, current: $${stock.currentPrice}, ${gainLoss >= 0 ? 'gain' : 'loss'}: ${gainLossPercent.toFixed(2)}%), `;
      });
      context += `Total portfolio value: $${portfolioContext.totalValue}. `;
    } else {
      context += `The user's portfolio is not available. `;
    }
    context += `\nChat history:\n`;
    if (Array.isArray(userChatHistory) && userChatHistory.length > 1) {
      userChatHistory.slice(-10).forEach(msg => {
        context += `[${msg.role}] ${msg.content}\n`;
      });
    }
    context += `\nProvide helpful, accurate, and educational financial advice based on the user's portfolio and questions. Keep responses concise but informative. Always remind users that this is educational information only and they should consult with a professional financial advisor for investment decisions. If asked about specific stocks, provide factual information about performance, sectors, and general market trends. Avoid giving specific buy/sell recommendations.`;

    // Prepare messages for OpenAI Chat API
    const messages = [
      { role: 'system', content: context },
      { role: 'user', content: message }
    ];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const aiText = response.data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    return aiText.trim();
  } catch (error) {
    console.error('AI response generation error (OpenAI):', error?.response?.data || error.message);
    if (error.code === 'ECONNABORTED') {
      return "I'm sorry, the request timed out. Please try again.";
    } else if (error.response?.status === 401) {
      return "I'm sorry, there's an authentication issue with the AI service.";
    } else if (error.response?.status === 429) {
      return "I'm sorry, the AI service is currently rate limited. Please try again in a moment.";
    }
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
  }
}

// Build context for AI - ENHANCED VERSION
function buildContext(portfolioContext, chatHistory) {
  let context = "You are a knowledgeable financial advisor AI assistant. ";
  
  if (portfolioContext && portfolioContext.portfolio && portfolioContext.portfolio.length > 0) {
    context += `The user's current portfolio includes: `;
    portfolioContext.portfolio.forEach(stock => {
      const gainLoss = stock.gainLoss || 0;
      const gainLossPercent = stock.gainLossPercentage || 0;
      context += `${stock.symbol} (${stock.shares} shares at $${stock.purchasePrice}, current: $${stock.currentPrice}, ${gainLoss >= 0 ? 'gain' : 'loss'}: ${gainLossPercent.toFixed(2)}%), `;
    });
    context += `Total portfolio value: $${portfolioContext.totalValue}. `;
  }
  
  context += `
    Provide helpful, accurate, and educational financial advice based on the user's portfolio and questions. 
    Keep responses concise but informative. 
    Always remind users that this is educational information only and they should consult with a professional financial advisor for investment decisions.
    If asked about specific stocks, provide factual information about performance, sectors, and general market trends.
    Avoid giving specific buy/sell recommendations.
  `;
  
  return context.trim();
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
    const stockValue = stock.totalValue || (stock.shares * stock.currentPrice) || 0;
    sectors[sector] = (sectors[sector] || 0) + stockValue;
    totalValue += stockValue;
  });
  
  const sectorWeights = Object.keys(sectors).map(sector => ({
    sector,
    weight: totalValue > 0 ? (sectors[sector] / totalValue) * 100 : 0
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
  const totalValue = portfolio.reduce((sum, stock) => sum + (stock.totalValue || 0), 0);
  const totalGainLoss = portfolio.reduce((sum, stock) => sum + (stock.gainLoss || 0), 0);
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
  const totalGainLoss = portfolio.reduce((sum, stock) => sum + (stock.gainLoss || 0), 0);
  const performance = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  
  const topPerformers = portfolio
    .filter(stock => stock.gainLossPercentage !== undefined)
    .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
    .slice(0, 3);
  
  const underPerformers = portfolio
    .filter(stock => stock.gainLossPercentage !== undefined)
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
  
  const lowPerformers = portfolio.filter(stock => (stock.gainLossPercentage || 0) < -10);
  if (lowPerformers.length > 0) {
    recommendations.push("Review underperforming stocks and consider rebalancing your portfolio.");
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
    'NFLX': 'Communication Services',
    'JPM': 'Financial Services',
    'JNJ': 'Healthcare',
    'PG': 'Consumer Staples',
    'KO': 'Consumer Staples',
    'DIS': 'Communication Services',
    'V': 'Financial Services',
    'MA': 'Financial Services'
  };
  
  return sectorMap[symbol.toUpperCase()] || 'Unknown';
}

function calculateVolatility(portfolio) {
  // Enhanced volatility calculation based on gain/loss percentages
  const gainLossPercentages = portfolio
    .filter(stock => stock.gainLossPercentage !== undefined)
    .map(stock => Math.abs(stock.gainLossPercentage));
  
  if (gainLossPercentages.length === 0) {
    return Math.random() * 15 + 5; // Fallback: 5-20% range
  }
  
  const avgVolatility = gainLossPercentages.reduce((sum, vol) => sum + vol, 0) / gainLossPercentages.length;
  return Math.min(avgVolatility, 35); // Cap at 35%
}

// Portfolio analytics endpoint
router.post('/analytics', authenticateToken, async (req, res) => {
  try {
    const { portfolio, history } = req.body;
    if (!portfolio || !Array.isArray(portfolio)) {
      return res.status(400).json({ error: 'Portfolio data is required' });
    }

    // Sector breakdown
    const sectors = {};
    let sectorTotalValue = 0;
    portfolio.forEach(stock => {
      const sector = getStockSector(stock.symbol);
      const stockValue = stock.totalValue || (stock.shares * stock.currentPrice) || 0;
      sectors[sector] = (sectors[sector] || 0) + stockValue;
      sectorTotalValue += stockValue;
    });
    
    const sectorBreakdown = Object.keys(sectors).map(sector => ({
      sector,
      value: sectors[sector],
      weight: (sectorTotalValue > 0 ? (sectors[sector] / sectorTotalValue) * 100 : 0)
    }));

    // Portfolio value history
    let portfolioHistory = [];
    if (Array.isArray(history) && history.length > 0) {
      portfolioHistory = history.map(h => ({
        date: h.date,
        value: h.portfolioValue || 0
      }));
    } else {
      // Fallback: single current value
      portfolioHistory = [{ 
        date: new Date().toISOString(), 
        value: sectorTotalValue 
      }];
    }

    // Calculate dashboard metrics
    const totalValue = portfolio.reduce((sum, stock) => sum + (stock.totalValue || 0), 0);
    const totalGainLoss = portfolio.reduce((sum, stock) => sum + (stock.gainLoss || 0), 0);
    const totalInvested = portfolio.reduce((sum, stock) => sum + ((stock.shares || 0) * (stock.purchasePrice || 0)), 0);
    const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    const totalStocks = portfolio.length;

    res.json({
      sectorBreakdown,
      history: portfolioHistory,
      totalValue,
      totalGainLoss,
      totalGainLossPercentage,
      totalStocks
    });
  } catch (error) {
    console.error('Portfolio analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

module.exports = router;