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
    const { category = 'all', limit = 10 } = req.query;
    
    const news = await getMarketNews(category, parseInt(limit));
    
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
  // Mock news data (replace with real news API)
  const mockNews = [
    {
      id: 1,
      title: "Federal Reserve Signals Potential Rate Hike in Next Meeting",
      summary: "The Federal Reserve has indicated a possible interest rate increase in the upcoming meeting, which could impact technology stocks and growth companies.",
      category: "monetary-policy",
      impact: "negative",
      affectedSectors: ["Technology", "Growth Stocks"],
      affectedStocks: ["AAPL", "GOOGL", "MSFT", "TSLA"],
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      source: "Financial Times",
      url: "#"
    },
    {
      id: 2,
      title: "Tech Giants Report Strong Q3 Earnings",
      summary: "Major technology companies have reported better-than-expected quarterly earnings, driving market optimism.",
      category: "earnings",
      impact: "positive",
      affectedSectors: ["Technology"],
      affectedStocks: ["AAPL", "GOOGL", "MSFT", "META"],
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      source: "Reuters",
      url: "#"
    },
    {
      id: 3,
      title: "Oil Prices Surge on Supply Concerns",
      summary: "Oil prices have reached new highs due to supply chain disruptions and geopolitical tensions.",
      category: "commodities",
      impact: "mixed",
      affectedSectors: ["Energy", "Transportation"],
      affectedStocks: ["XOM", "CVX", "DAL", "UAL"],
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      source: "Bloomberg",
      url: "#"
    },
    {
      id: 4,
      title: "Inflation Data Shows Cooling Trend",
      summary: "Latest inflation figures indicate a cooling trend, which could support consumer spending and retail stocks.",
      category: "inflation",
      impact: "positive",
      affectedSectors: ["Consumer Discretionary", "Retail"],
      affectedStocks: ["AMZN", "WMT", "TGT", "COST"],
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      source: "Wall Street Journal",
      url: "#"
    },
    {
      id: 5,
      title: "AI Chip Demand Drives Semiconductor Rally",
      summary: "Growing demand for AI chips has led to a significant rally in semiconductor stocks.",
      category: "technology",
      impact: "positive",
      affectedSectors: ["Technology", "Semiconductors"],
      affectedStocks: ["NVDA", "AMD", "INTC", "TSM"],
      publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      source: "CNBC",
      url: "#"
    }
  ];
  
  let filteredNews = mockNews;
  
  if (category !== 'all') {
    filteredNews = mockNews.filter(news => news.category === category);
  }
  
  return filteredNews.slice(0, limit);
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
  // Mock sentiment data (replace with real sentiment analysis)
  const sentiment = {
    overall: "neutral",
    score: 0.52, // 0-1 scale
    breakdown: {
      technology: 0.65,
      healthcare: 0.45,
      financial: 0.38,
      consumer: 0.58,
      energy: 0.72
    },
    indicators: {
      fearGreedIndex: 45, // 0-100
      volatilityIndex: 22.5,
      marketMomentum: "slightly_bullish"
    },
    trends: {
      shortTerm: "neutral",
      mediumTerm: "bullish",
      longTerm: "bullish"
    }
  };
  
  return sentiment;
}

// Get trending topics
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const trending = await getTrendingTopics();
    
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
async function getTrendingTopics() {
  return [
    {
      topic: "Federal Reserve Policy",
      mentions: 1250,
      sentiment: "negative",
      impact: "high"
    },
    {
      topic: "AI Technology",
      mentions: 890,
      sentiment: "positive",
      impact: "high"
    },
    {
      topic: "Earnings Season",
      mentions: 650,
      sentiment: "positive",
      impact: "medium"
    },
    {
      topic: "Oil Prices",
      mentions: 420,
      sentiment: "mixed",
      impact: "medium"
    },
    {
      topic: "Inflation Data",
      mentions: 380,
      sentiment: "positive",
      impact: "high"
    }
  ];
}

module.exports = router; 