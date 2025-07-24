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

// Get market news and events
router.get('/', authenticateToken, async (req, res) => {
  try {
    const news = await getMarketNews(10);
    res.json({
      news: news,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get news impact on specific stocks
router.get('/impact/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 7 } = req.query;
    
    const impact = await getNewsImpact(symbol, parseInt(days));
    
    res.json({
      symbol: symbol.toUpperCase(),
      impact: impact,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get news impact error:', error);
    res.status(500).json({ error: 'Failed to fetch news impact' });
  }
});

// Get recommended actions based on current events
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const { portfolio } = req.query;
    let userPortfolio = [];
    
    if (portfolio) {
      try {
        userPortfolio = JSON.parse(portfolio);
      } catch (e) {
        console.error('Portfolio parsing error:', e);
      }
    }
    
    const recommendations = await generateRecommendations(userPortfolio);
    
    res.json({
      recommendations: recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get market sentiment analysis
router.get('/sentiment', authenticateToken, async (req, res) => {
  try {
    const sentiment = await getMarketSentiment();
    
    res.json({
      sentiment: sentiment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get sentiment error:', error);
    res.status(500).json({ error: 'Failed to fetch market sentiment' });
  }
});

// Get market news
async function getMarketNews(category, limit) {
  // Fetch 10 most recent news from Alpha Vantage News & Sentiment API
  const axios = require('axios');
  const ALPHA_VANTAGE_API_KEY = 'F8CLK1GHMVGECNC7';
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'NEWS_SENTIMENT',
        apikey: ALPHA_VANTAGE_API_KEY,
        topics: 'financial_markets',
        sort: 'LATEST',
        limit: 10
      }
    });
    // For each article, get BERT sentiment
    const articles = await Promise.all(
      (response.data.feed || []).slice(0, 10).map(async (article, idx) => {
        let bertSentiment = 'unknown';
        try {
          const bertRes = await axios.post('http://localhost:8000/sentiment', { text: article.summary });
          bertSentiment = bertRes.data && bertRes.data.sentiment ? String(bertRes.data.sentiment).toLowerCase() : 'unknown';
        } catch (e) {
          bertSentiment = 'unknown';
        }
        // Ensure publishedAt is a valid ISO string
        let publishedAt = article.time_published;
        if (publishedAt && !isNaN(Date.parse(publishedAt))) {
          publishedAt = new Date(publishedAt).toISOString();
        } else {
          publishedAt = new Date().toISOString();
        }
        return {
          id: idx + 1,
          title: article.title,
          summary: article.summary,
          category: 'latest',
          impact: bertSentiment,
          affectedSectors: article.sector ? [article.sector] : [],
          affectedStocks: article.ticker_sentiment ? article.ticker_sentiment.map(t => t.ticker) : [],
          publishedAt,
          source: article.source,
          url: article.url
        };
      })
    );
    return articles;
  } catch (err) {
    console.error('Alpha Vantage news fetch error:', err);
    return [];
  }
}

// Get news impact on specific stock
async function getNewsImpact(symbol, days) {
  // Mock impact data (replace with real analysis)
  const mockImpact = {
    symbol: symbol.toUpperCase(),
    sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
    impactScore: Math.random() * 10,
    recentNews: [
      {
        title: `Recent news affecting ${symbol}`,
        sentiment: 'positive',
        impact: 'moderate',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    priceImpact: {
      expected: Math.random() * 5 - 2.5, // -2.5% to +2.5%
      confidence: Math.random() * 100
    },
    recommendations: [
      "Monitor earnings announcements",
      "Watch for sector-specific news",
      "Consider technical support levels"
    ]
  };
  
  return mockImpact;
}

// Generate recommendations based on current events
async function generateRecommendations(portfolio) {
  const recommendations = [];
  
  // Market-wide recommendations
  recommendations.push({
    type: "market-wide",
    priority: "high",
    title: "Interest Rate Sensitivity",
    description: "With potential Fed rate hikes, consider reducing exposure to high-growth technology stocks that are sensitive to interest rates.",
    action: "Review portfolio allocation and consider adding defensive stocks.",
    affectedStocks: portfolio.filter(stock => 
      ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'].includes(stock.symbol)
    ).map(stock => stock.symbol)
  });
  
  recommendations.push({
    type: "sector-specific",
    priority: "medium",
    title: "Energy Sector Opportunities",
    description: "Rising oil prices present opportunities in energy stocks and related sectors.",
    action: "Consider adding energy stocks or ETFs to your portfolio.",
    affectedStocks: []
  });
  
  recommendations.push({
    type: "risk-management",
    priority: "high",
    title: "Diversification Check",
    description: "Ensure your portfolio is well-diversified across different sectors to mitigate sector-specific risks.",
    action: "Review sector allocation and consider rebalancing if needed.",
    affectedStocks: portfolio.map(stock => stock.symbol)
  });
  
  // Portfolio-specific recommendations
  if (portfolio.length > 0) {
    const techStocks = portfolio.filter(stock => 
      ['AAPL', 'GOOGL', 'MSFT', 'META', 'NVDA'].includes(stock.symbol)
    );
    
    if (techStocks.length > portfolio.length * 0.5) {
      recommendations.push({
        type: "portfolio-specific",
        priority: "high",
        title: "Technology Concentration Risk",
        description: "Your portfolio is heavily concentrated in technology stocks, which may be vulnerable to interest rate changes.",
        action: "Consider diversifying into other sectors like healthcare, consumer staples, or utilities.",
        affectedStocks: techStocks.map(stock => stock.symbol)
      });
    }
    
    const underperformers = portfolio.filter(stock => stock.gainLossPercentage < -10);
    if (underperformers.length > 0) {
      recommendations.push({
        type: "portfolio-specific",
        priority: "medium",
        title: "Review Underperforming Positions",
        description: "Some of your holdings have significant losses. Consider reviewing these positions.",
        action: "Analyze fundamentals and consider whether to hold, average down, or exit positions.",
        affectedStocks: underperformers.map(stock => stock.symbol)
      });
    }
  }
  
  return recommendations;
}

// Get market sentiment
async function getMarketSentiment() {
  // Fetch Alpha Vantage sector performance data
  const axios = require('axios');
  const ALPHA_VANTAGE_API_KEY = 'F8CLK1GHMVGECNC7';
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'SECTOR',
        apikey: ALPHA_VANTAGE_API_KEY
      }
    });
    // Use "Rank A: Real-Time Performance" as sector sentiment
    const sectorPerf = response.data["Rank A: Real-Time Performance"] || {};
    // Normalize sector data to percent (e.g., +2.34% => 0.0234)
    const sectorData = {};
    Object.entries(sectorPerf).forEach(([sector, value]) => {
      let num = parseFloat(value.replace('%', ''));
      sectorData[sector] = isNaN(num) ? 0 : num / 100;
    });
    // Fetch latest news and determine majority sentiment
    let overall = 'neutral';
    let score = 0.5;
    try {
      const news = await getMarketNews(10);
      const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      news.forEach(article => {
        if (article.impact === 'positive') sentimentCounts.positive++;
        else if (article.impact === 'negative') sentimentCounts.negative++;
        else sentimentCounts.neutral++;
      });
      const maxCount = Math.max(sentimentCounts.positive, sentimentCounts.negative, sentimentCounts.neutral);
      if (maxCount > 0) {
        if (sentimentCounts.positive === maxCount) {
          overall = 'positive';
          score = 0.7;
        } else if (sentimentCounts.negative === maxCount) {
          overall = 'negative';
          score = 0.3;
        } else {
          overall = 'neutral';
          score = 0.5;
        }
      }
    } catch (e) {
      // fallback to neutral
    }
    return {
      overall,
      score,
      indicators: {
        fearGreedIndex: 52,
        volatilityIndex: 18.2
      },
      sectorData
    };
  } catch (err) {
    console.error('Alpha Vantage sector sentiment error:', err);
    // Fallback mock sector data
    const mockSectorData = {
      'Technology': 0.021,
      'Health Care': -0.012,
      'Financials': 0.008,
      'Consumer Discretionary': 0.015,
      'Industrials': -0.005,
      'Energy': 0.011,
      'Utilities': -0.003,
      'Real Estate': 0.004,
      'Materials': 0.007,
      'Consumer Staples': 0.002,
      'Communication Services': 0.013
    };
    return {
      overall: 'neutral',
      score: 0.5,
      indicators: {
        fearGreedIndex: 52,
        volatilityIndex: 18.2
      },
      sectorData: mockSectorData
    };
  }
}

// Get trending topics
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const trending = await getTrendingTopicsFromNewsAPI();
    res.json({
      trending: trending,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get trending topics error:', error);
    res.status(500).json({ error: 'Failed to fetch trending topics' });
  }
});

// Get trending topics
// Get trending topics from NewsAPI
async function getTrendingTopicsFromNewsAPI() {
  // Fetch trending topics from Alpha Vantage News & Sentiment API
  const axios = require('axios');
  const ALPHA_VANTAGE_API_KEY = 'F8CLK1GHMVGECNC7';
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'NEWS_SENTIMENT',
        apikey: ALPHA_VANTAGE_API_KEY,
        topics: 'financial_markets',
        sort: 'LATEST',
        limit: 50
      }
    });
    const articles = response.data.feed || [];
    const topicCounts = {};
    const topicSentiments = {};
    articles.forEach(article => {
      if (article.title) {
        const words = article.title.split(/\W+/).filter(w => w.length > 3);
        words.forEach(word => {
          const key = word.toLowerCase();
          topicCounts[key] = (topicCounts[key] || 0) + 1;
          // Track sentiment for this topic
          if (!topicSentiments[key]) topicSentiments[key] = { positive: 0, negative: 0, neutral: 0 };
          const sentiment = (article.impact || article.sentiment || '').toLowerCase();
          if (sentiment === 'positive') topicSentiments[key].positive++;
          else if (sentiment === 'negative') topicSentiments[key].negative++;
          else topicSentiments[key].neutral++;
        });
      }
    });
    // Get top 5 trending topics
    const sortedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, mentions]) => {
        // Determine majority sentiment for this topic
        const sentiments = topicSentiments[topic] || { positive: 0, negative: 0, neutral: 0 };
        let sentiment = 'neutral';
        let impact = 'low';
        const maxCount = Math.max(sentiments.positive, sentiments.negative, sentiments.neutral);
        if (maxCount > 0) {
          if (sentiments.positive === maxCount) sentiment = 'positive';
          else if (sentiments.negative === maxCount) sentiment = 'negative';
          else sentiment = 'neutral';
        }
        if (mentions > 10) impact = 'high';
        else if (mentions > 5) impact = 'medium';
        return {
          topic,
          mentions,
          sentiment,
          impact
        };
      });
    return sortedTopics;
  } catch (error) {
    console.error('Trending topics Alpha Vantage error:', error);
    return [];
  }
}

module.exports = router;