const axios = require('axios');

// Mock AI responses for now (in production, you'd integrate with OpenAI or another AI service)
const mockAIResponses = {
  "portfolio": {
    "keywords": ["portfolio", "invest", "stock", "holdings", "diversify"],
    "response": "I can help you with portfolio management! Here are some key insights:\n\n• Your portfolio shows good diversification across technology and healthcare sectors\n• Consider rebalancing quarterly to maintain your target allocation\n• Current market conditions suggest focusing on defensive stocks\n\nWould you like me to analyze specific stocks or provide rebalancing recommendations?"
  },
  "analysis": {
    "keywords": ["analyze", "prediction", "forecast", "trend", "technical"],
    "response": "I can provide stock analysis and predictions! Here's what I can help with:\n\n• Technical analysis using price patterns and indicators\n• Fundamental analysis of company financials\n• Market sentiment analysis from news and social media\n• Risk assessment and volatility predictions\n\nWhich stock would you like me to analyze?"
  },
  "market": {
    "keywords": ["market", "economy", "trend", "sector", "indices"],
    "response": "Here's my market analysis:\n\n• S&P 500 is showing bullish momentum with strong earnings\n• Technology sector leading gains, up 15% YTD\n• Fed policy remains accommodative, supporting growth\n• Watch for potential volatility around earnings season\n\nWould you like specific sector analysis or market timing insights?"
  },
  "news": {
    "keywords": ["news", "earnings", "announcement", "fed", "policy"],
    "response": "Latest market news and insights:\n\n• Apple reported strong Q4 earnings, beating expectations\n• Fed signals potential rate cuts in 2024\n• Tesla faces production challenges but maintains growth outlook\n• Microsoft cloud services revenue surges 25%\n\nHow would you like me to analyze the impact of these events on your investments?"
  },
  "default": {
    "response": "Hello! I'm your AI financial assistant. I can help you with:\n\n• Portfolio analysis and recommendations\n• Stock research and predictions\n• Market trends and insights\n• News analysis and impact assessment\n• Risk management strategies\n\nWhat would you like to know about today?"
  }
};

// Function to determine response type based on user input
function getResponseType(userInput) {
  const input = userInput.toLowerCase();
  
  for (const [type, data] of Object.entries(mockAIResponses)) {
    if (type === 'default') continue;
    
    if (data.keywords.some(keyword => input.includes(keyword))) {
      return type;
    }
  }
  
  return 'default';
}

// Function to generate contextual response
function generateResponse(userInput, conversationHistory = []) {
  const responseType = getResponseType(userInput);
  const baseResponse = mockAIResponses[responseType].response;
  
  // Add some contextual elements based on conversation history
  let contextualResponse = baseResponse;
  
  // If user mentioned specific stocks, add them to response
  const stockMentions = userInput.match(/\b[A-Z]{1,5}\b/g);
  if (stockMentions && stockMentions.length > 0) {
    const stocks = stockMentions.slice(0, 3).join(', ');
    contextualResponse += `\n\nI noticed you mentioned ${stocks}. Would you like specific analysis for these stocks?`;
  }
  
  // Add follow-up questions based on context
  if (responseType === 'portfolio') {
    contextualResponse += '\n\nWhat specific aspect of your portfolio would you like me to focus on?';
  } else if (responseType === 'analysis') {
    contextualResponse += '\n\nWhat time horizon are you looking at for your analysis?';
  }
  
  return contextualResponse;
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
        };
      }

      // Generate AI response
      const aiResponse = generateResponse(message, conversationHistory);
      
      // Add some delay to simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1000));

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
              "Analyze my portfolio",
              "What's the market outlook?",
              "Latest stock news",
              "Investment recommendations"
            ]
          }
        })
      };
    }

    // Get chat suggestions
    if (httpMethod === 'GET' && path.includes('/suggestions')) {
      const suggestions = [
        "How should I diversify my portfolio?",
        "What's the outlook for tech stocks?",
        "Analyze AAPL stock for me",
        "What are the market risks today?",
        "Help me understand my portfolio performance",
        "What stocks should I buy now?",
        "How do I manage investment risk?",
        "What's the impact of Fed policy on stocks?"
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
          description: "Analyze your portfolio performance and provide recommendations",
          features: ["Diversification analysis", "Risk assessment", "Rebalancing suggestions"]
        },
        stockAnalysis: {
          description: "Comprehensive stock research and predictions",
          features: ["Technical analysis", "Fundamental analysis", "Sentiment analysis"]
        },
        marketInsights: {
          description: "Real-time market trends and economic analysis",
          features: ["Sector analysis", "Market timing", "Economic indicators"]
        },
        newsAnalysis: {
          description: "Analyze news impact on stocks and markets",
          features: ["Sentiment analysis", "Event impact assessment", "Trend identification"]
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
