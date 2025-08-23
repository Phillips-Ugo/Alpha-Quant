const axios = require('axios');

// In-memory chat history (replace with database in production)
let chatHistory = {};

// Generate AI response - OpenAI DIRECT VERSION with Fallback
async function generateAIResponse(message, portfolioContext, userChatHistory) {
  try {
    // Use environment variable for API key ONLY
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('sk-proj')) {
      console.warn('OpenAI API key not properly configured, using fallback responses');
      return generateFallbackResponse(message, portfolioContext);
    }

    // Build a broad context including portfolio and chat history
    let context = "You are a knowledgeable financial advisor AI assistant. ";
    
    if (portfolioContext && portfolioContext.length > 0) {
      context += "The user's current portfolio includes: " + 
        portfolioContext.map(stock => `${stock.symbol} (${stock.shares} shares at $${stock.purchasePrice})`).join(', ') + ". ";
    }

    // Add recent chat history for context
    if (userChatHistory && userChatHistory.length > 0) {
      const recentMessages = userChatHistory.slice(-6); // Last 6 messages
      context += "Recent conversation context: " + 
        recentMessages.map(msg => `${msg.role}: ${msg.content}`).join(' | ') + ". ";
    }

    const fullPrompt = context + "User question: " + message;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial advisor AI assistant. Provide accurate, helpful, and educational responses about stocks, investing, and financial markets. Always include disclaimers that this is not financial advice.'
        },
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Invalid response from OpenAI');
    }

  } catch (error) {
    console.error('OpenAI API error:', error.message);
    return generateFallbackResponse(message, portfolioContext);
  }
}

// Generate fallback response when OpenAI is not available
function generateFallbackResponse(message, portfolioContext) {
  const lowerMessage = message.toLowerCase();
  
  // Portfolio analysis responses
  if (lowerMessage.includes('portfolio') || lowerMessage.includes('holdings')) {
    if (portfolioContext && portfolioContext.length > 0) {
      const totalValue = portfolioContext.reduce((sum, stock) => sum + (stock.currentPrice * stock.shares), 0);
      const totalGain = portfolioContext.reduce((sum, stock) => {
        const gain = (stock.currentPrice - stock.purchasePrice) * stock.shares;
        return sum + gain;
      }, 0);
      
      return `Based on your portfolio, you have ${portfolioContext.length} positions with a total value of approximately $${totalValue.toFixed(2)}. Your total unrealized gain/loss is $${totalGain.toFixed(2)}. 

Key holdings include: ${portfolioContext.slice(0, 3).map(stock => `${stock.symbol} (${stock.shares} shares)`).join(', ')}.

Remember: This is for informational purposes only and not financial advice. Always consult with a qualified financial advisor before making investment decisions.`;
    } else {
      return "I don't see any portfolio data available. You can add stocks to your portfolio through the portfolio management section to get personalized analysis.";
    }
  }

  // Market analysis responses
  if (lowerMessage.includes('market') || lowerMessage.includes('trend')) {
    return `The current market shows mixed signals. Technology stocks have been performing well, while some sectors like energy are experiencing volatility. 

Key market indicators to watch:
- Federal Reserve policy decisions
- Inflation data
- Corporate earnings reports
- Geopolitical events

Remember: Market conditions can change rapidly. This is not financial advice - always do your own research and consider consulting with a financial advisor.`;
  }

  // Stock-specific responses
  if (lowerMessage.includes('stock') || lowerMessage.includes('invest')) {
    return `When analyzing stocks, consider these key factors:

1. **Fundamentals**: P/E ratio, earnings growth, debt levels
2. **Technical Analysis**: Price trends, support/resistance levels
3. **Market Position**: Competitive advantages, industry trends
4. **Risk Assessment**: Volatility, sector exposure

Popular stocks like AAPL, MSFT, GOOGL, and NVDA are often discussed due to their strong fundamentals and market leadership.

Important: This is educational information only. Always conduct thorough research and consider your risk tolerance before investing.`;
  }

  // General financial advice
  if (lowerMessage.includes('advice') || lowerMessage.includes('recommend')) {
    return `I can provide educational information about investing, but I cannot give specific financial advice. Here are some general principles:

**Investment Basics:**
- Diversify your portfolio across different sectors
- Consider your time horizon and risk tolerance
- Regularly review and rebalance your holdings
- Invest in what you understand

**Risk Management:**
- Never invest more than you can afford to lose
- Consider dollar-cost averaging
- Keep some cash for emergencies
- Don't try to time the market

**Research Tips:**
- Read company financial statements
- Follow market news and trends
- Consider both technical and fundamental analysis
- Consult with qualified financial professionals

Remember: This is educational content only. For personalized financial advice, please consult with a licensed financial advisor.`;
  }

  // Default response
  return `I'm here to help with financial education and market information! I can discuss:

- Portfolio analysis and diversification
- Market trends and indicators
- Investment strategies and principles
- Stock research and analysis
- Risk management concepts

What specific aspect of investing or the markets would you like to learn more about?

Note: I provide educational information only. For personalized financial advice, please consult with a qualified financial advisor.`;
}

// Get chat suggestions
function getChatSuggestions() {
  return [
    "How should I diversify my portfolio?",
    "What are the current market trends?",
    "Can you analyze my portfolio performance?",
    "What are good stocks for beginners?",
    "How do I manage investment risk?",
    "What should I know about market volatility?",
    "How do I research stocks before investing?",
    "What are the benefits of long-term investing?"
  ];
}

// Get AI capabilities
function getAICapabilities() {
  return {
    features: [
      "Portfolio Analysis",
      "Market Education",
      "Investment Principles",
      "Risk Management",
      "Stock Research Guidance",
      "Market Trend Discussion"
    ],
    limitations: [
      "Cannot provide specific financial advice",
      "Cannot predict market movements",
      "Cannot recommend specific stocks",
      "Educational purposes only"
    ],
    disclaimers: [
      "This is not financial advice",
      "Always consult with qualified professionals",
      "Do your own research before investing",
      "Past performance doesn't guarantee future results"
    ]
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
    const userId = 'default-user'; // Since we removed authentication, use a default user

    // Get chat history
    if (httpMethod === 'GET' && path.includes('/chat')) {
      const userChatHistory = chatHistory[userId] || [];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          messages: userChatHistory
        })
      };
    }

    // Send message to AI
    if (httpMethod === 'POST' && path.includes('/chat')) {
      const data = JSON.parse(body);
      const { message, portfolioContext } = data;

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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Message sent successfully',
          response: aiResponse,
          chatHistory: chatHistory[userId]
        })
      };
    }

    // Clear chat history
    if (httpMethod === 'DELETE' && path.includes('/chat')) {
      chatHistory[userId] = [];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Chat history cleared'
        })
      };
    }

    // Get chat suggestions
    if (httpMethod === 'GET' && path.includes('/suggestions')) {
      const suggestions = getChatSuggestions();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          suggestions
        })
      };
    }

    // Get AI capabilities
    if (httpMethod === 'GET' && path.includes('/capabilities')) {
      const capabilities = getAICapabilities();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          capabilities
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
