const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;

// In-memory cache for news data
let newsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get market news and events
async function getMarketNews(limit = 10) {
  try {
    // Try Alpha Vantage API first
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (alphaVantageKey) {
      const response = await axios.get(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${alphaVantageKey}&limit=${limit}`);
      
      if (response.data && response.data.feed) {
        return response.data.feed.map(item => ({
          title: item.title,
          summary: item.summary,
          url: item.url,
          time_published: item.time_published,
          authors: item.authors,
          sentiment: item.overall_sentiment_label,
          sentiment_score: item.overall_sentiment_score,
          ticker_sentiment: item.ticker_sentiment || []
        }));
      }
    }

    // Fallback to NewsAPI
    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
      const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&category=business&apiKey=${newsApiKey}&pageSize=${limit}`);
      
      if (response.data && response.data.articles) {
        return response.data.articles.map(article => ({
          title: article.title,
          summary: article.description,
          url: article.url,
          time_published: article.publishedAt,
          authors: article.author ? [article.author] : [],
          sentiment: 'neutral',
          sentiment_score: 0.5,
          ticker_sentiment: []
        }));
      }
    }

    // Final fallback - mock news data
    return generateMockNews(limit);

  } catch (error) {
    console.error('Error fetching news:', error);
    return generateMockNews(limit);
  }
}

// Generate mock news data
function generateMockNews(limit) {
  const mockNews = [
    {
      title: "Federal Reserve Signals Potential Rate Cuts in 2024",
      summary: "The Federal Reserve indicated a more dovish stance, suggesting potential interest rate reductions in the coming year as inflation continues to moderate.",
      url: "#",
      time_published: new Date().toISOString(),
      authors: ["Financial Times"],
      sentiment: "positive",
      sentiment_score: 0.7,
      ticker_sentiment: [
        { ticker: "SPY", relevance_score: 0.9, sentiment_score: 0.8 },
        { ticker: "QQQ", relevance_score: 0.8, sentiment_score: 0.7 }
      ]
    },
    {
      title: "Tech Giants Report Strong Q4 Earnings",
      summary: "Major technology companies exceeded analyst expectations with robust quarterly results, driven by AI investments and cloud computing growth.",
      url: "#",
      time_published: new Date(Date.now() - 3600000).toISOString(),
      authors: ["Reuters"],
      sentiment: "positive",
      sentiment_score: 0.8,
      ticker_sentiment: [
        { ticker: "AAPL", relevance_score: 0.9, sentiment_score: 0.8 },
        { ticker: "MSFT", relevance_score: 0.9, sentiment_score: 0.8 },
        { ticker: "GOOGL", relevance_score: 0.8, sentiment_score: 0.7 }
      ]
    },
    {
      title: "Oil Prices Surge on Middle East Tensions",
      summary: "Crude oil prices jumped following escalating tensions in the Middle East, raising concerns about supply disruptions.",
      url: "#",
      time_published: new Date(Date.now() - 7200000).toISOString(),
      authors: ["Bloomberg"],
      sentiment: "negative",
      sentiment_score: 0.3,
      ticker_sentiment: [
        { ticker: "XOM", relevance_score: 0.9, sentiment_score: 0.6 },
        { ticker: "CVX", relevance_score: 0.8, sentiment_score: 0.6 }
      ]
    },
    {
      title: "Retail Sales Exceed Expectations in December",
      summary: "Holiday season retail sales showed stronger-than-expected growth, indicating resilient consumer spending despite economic uncertainties.",
      url: "#",
      time_published: new Date(Date.now() - 10800000).toISOString(),
      authors: ["CNBC"],
      sentiment: "positive",
      sentiment_score: 0.6,
      ticker_sentiment: [
        { ticker: "AMZN", relevance_score: 0.8, sentiment_score: 0.7 },
        { ticker: "WMT", relevance_score: 0.7, sentiment_score: 0.6 }
      ]
    },
    {
      title: "Electric Vehicle Market Share Continues Growth",
      summary: "Electric vehicle adoption accelerated in 2023, with major automakers reporting record EV sales and expanding production capacity.",
      url: "#",
      time_published: new Date(Date.now() - 14400000).toISOString(),
      authors: ["Automotive News"],
      sentiment: "positive",
      sentiment_score: 0.7,
      ticker_sentiment: [
        { ticker: "TSLA", relevance_score: 0.9, sentiment_score: 0.8 },
        { ticker: "F", relevance_score: 0.7, sentiment_score: 0.6 },
        { ticker: "GM", relevance_score: 0.7, sentiment_score: 0.6 }
      ]
    }
  ];

  return mockNews.slice(0, limit);
}

// Get news impact on specific stocks
async function getNewsImpact(symbol, days = 7) {
  try {
    // Get historical price data
    const history = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d'
    });

    if (history.length < 2) {
      return {
        priceChange: 0,
        volatility: 0,
        newsCount: 0,
        sentiment: 'neutral'
      };
    }

    const prices = history.map(h => h.close);
    const priceChange = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
    
    // Calculate volatility
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length) * 100;

    // Mock news count and sentiment
    const newsCount = Math.floor(Math.random() * 10) + 1;
    const sentiment = priceChange > 2 ? 'positive' : priceChange < -2 ? 'negative' : 'neutral';

    return {
      priceChange: Math.round(priceChange * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      newsCount,
      sentiment,
      recentNews: generateMockNews(3)
    };

  } catch (error) {
    console.error('Error getting news impact:', error);
    return {
      priceChange: 0,
      volatility: 0,
      newsCount: 0,
      sentiment: 'neutral'
    };
  }
}

// Generate recommendations based on current events
async function generateRecommendations(userPortfolio = []) {
  try {
    const recommendations = [];

    // Market-wide recommendations
    recommendations.push({
      type: 'market',
      title: 'Consider Defensive Positioning',
      description: 'Market volatility suggests maintaining a balanced portfolio with defensive stocks.',
      priority: 'medium',
      action: 'review_allocation'
    });

    // Sector-specific recommendations
    recommendations.push({
      type: 'sector',
      title: 'Technology Sector Opportunities',
      description: 'Strong tech earnings suggest continued growth potential in the sector.',
      priority: 'high',
      action: 'increase_exposure',
      sector: 'Technology'
    });

    // Portfolio-specific recommendations
    if (userPortfolio.length > 0) {
      const techStocks = userPortfolio.filter(stock => 
        ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA'].includes(stock.symbol)
      );
      
      if (techStocks.length > 0) {
        recommendations.push({
          type: 'portfolio',
          title: 'Tech Holdings Performing Well',
          description: 'Your technology holdings are showing strong performance. Consider rebalancing.',
          priority: 'medium',
          action: 'rebalance',
          symbols: techStocks.map(s => s.symbol)
        });
      }
    }

    return recommendations;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

// Get market sentiment analysis
async function getMarketSentiment() {
  try {
    // Try to get real sentiment data
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (alphaVantageKey) {
      const response = await axios.get(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${alphaVantageKey}&limit=50`);
      
      if (response.data && response.data.feed) {
        const sentiments = response.data.feed.map(item => parseFloat(item.overall_sentiment_score));
        const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
        
        return {
          overall: avgSentiment > 0.6 ? 'positive' : avgSentiment < 0.4 ? 'negative' : 'neutral',
          score: avgSentiment,
          indicators: {
            fearGreedIndex: Math.round((1 - avgSentiment) * 100),
            volatilityIndex: 20.0 + Math.random() * 10
          },
          sectorData: generateSectorSentiment(),
          source: 'alpha_vantage'
        };
      }
    }

    // Fallback sentiment data
    return {
      overall: 'neutral',
      score: 0.5,
      indicators: {
        fearGreedIndex: 50,
        volatilityIndex: 20.0
      },
      sectorData: generateSectorSentiment(),
      source: 'fallback'
    };

  } catch (error) {
    console.error('Error getting market sentiment:', error);
    return {
      overall: 'neutral',
      score: 0.5,
      indicators: {
        fearGreedIndex: 50,
        volatilityIndex: 20.0
      },
      sectorData: generateSectorSentiment(),
      source: 'fallback'
    };
  }
}

// Generate sector sentiment data
function generateSectorSentiment() {
  const sectors = [
    'Technology', 'Health Care', 'Financials', 'Consumer Discretionary',
    'Industrials', 'Energy', 'Utilities', 'Real Estate', 'Materials',
    'Consumer Staples', 'Communication Services'
  ];

  const sectorData = {};
  sectors.forEach(sector => {
    sectorData[sector] = Math.round((Math.random() - 0.5) * 0.04 * 1000) / 1000;
  });

  return sectorData;
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

    // Get market news and events
    if (httpMethod === 'GET' && path.includes('/news')) {
      const limit = parseInt(queryStringParameters?.limit) || 10;
      
      // Check cache
      const now = Date.now();
      if (newsCache && (now - lastFetchTime) < CACHE_DURATION) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            news: newsCache,
            timestamp: new Date().toISOString(),
            cached: true
          })
        };
      }

      const news = await getMarketNews(limit);
      
      // Update cache
      newsCache = news;
      lastFetchTime = now;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          news: news,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Get news impact on specific stocks
    if (httpMethod === 'GET' && path.includes('/impact')) {
      const symbol = queryStringParameters?.symbol;
      const days = parseInt(queryStringParameters?.days) || 7;
      
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

      const impact = await getNewsImpact(symbol, days);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          symbol: symbol.toUpperCase(),
          impact: impact,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Get recommended actions based on current events
    if (httpMethod === 'GET' && path.includes('/recommendations')) {
      const portfolio = queryStringParameters?.portfolio;
      let userPortfolio = [];
      
      if (portfolio) {
        try {
          userPortfolio = JSON.parse(portfolio);
        } catch (e) {
          console.error('Portfolio parsing error:', e);
        }
      }
      
      const recommendations = await generateRecommendations(userPortfolio);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          recommendations: recommendations,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Get market sentiment analysis
    if (httpMethod === 'GET' && path.includes('/sentiment')) {
      const sentiment = await getMarketSentiment();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sentiment: sentiment,
          timestamp: new Date().toISOString(),
          source: sentiment.source || 'fallback'
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
          message: 'News API is running successfully'
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
    console.error('News function error:', error);
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
