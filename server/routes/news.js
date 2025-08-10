const express = require('express');
const router = express.Router();

// Get market news and events
router.get('/', async (req, res) => {
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
router.get('/impact/:symbol', async (req, res) => {
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
router.get('/recommendations', async (req, res) => {
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
router.get('/sentiment', async (req, res) => {
  try {
    const sentiment = await getMarketSentiment();
    
    res.json({
      sentiment: sentiment,
      timestamp: new Date().toISOString(),
      source: sentiment.source || 'fallback'
    });
  } catch (error) {
    console.error('Get sentiment error:', error);
    // Return fallback sentiment data instead of error
    res.json({
      sentiment: {
        overall: 'neutral',
        score: 0.5,
        indicators: {
          fearGreedIndex: 50,
          volatilityIndex: 20.0
        },
        sectorData: {
          'Technology': 0.01,
          'Health Care': -0.005,
          'Financials': 0.008,
          'Consumer Discretionary': 0.012,
          'Industrials': -0.003,
          'Energy': 0.015,
          'Utilities': -0.002,
          'Real Estate': 0.003,
          'Materials': 0.006,
          'Consumer Staples': 0.001,
          'Communication Services': 0.009
        },
        source: 'fallback'
      },
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
});

// Get market news
async function getMarketNews(category, limit) {
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
      },
      timeout: 5000
    });

    const articles = (response.data.feed || []).slice(0, 10).map((article, idx) => {
      // Use simple sentiment analysis instead of external BERT API
      const sentiment = getSimpleSentiment(article.summary || article.title);
      
      // Safe date parsing
      let publishedAt;
      try {
        if (article.time_published && article.time_published.trim()) {
          // Alpha Vantage uses format like "20241201T123000"
          const timeStr = article.time_published.trim();
          if (timeStr.length >= 8) {
            // Parse YYYYMMDD format or similar
            const year = timeStr.substring(0, 4);
            const month = timeStr.substring(4, 6);
            const day = timeStr.substring(6, 8);
            const hour = timeStr.length > 8 ? timeStr.substring(9, 11) || '00' : '00';
            const minute = timeStr.length > 10 ? timeStr.substring(11, 13) || '00' : '00';
            
            publishedAt = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`).toISOString();
          } else {
            publishedAt = new Date().toISOString();
          }
        } else {
          publishedAt = new Date().toISOString();
        }
      } catch (dateError) {
        publishedAt = new Date().toISOString();
      }
      
      return {
        id: idx + 1,
        title: article.title,
        summary: article.summary,
        category: 'latest',
        impact: sentiment,
        affectedSectors: article.sector ? [article.sector] : [],
        affectedStocks: article.ticker_sentiment ? article.ticker_sentiment.map(t => t.ticker) : [],
        publishedAt: publishedAt,
        source: article.source,
        url: article.url
      };
    });
    
    return articles;
  } catch (err) {
    console.error('Alpha Vantage news fetch error:', err);
    return getFallbackNews();
  }
}

// Fallback news data
function getFallbackNews() {
  return [
    {
      id: 1,
      title: "Market Shows Mixed Signals Amid Economic Uncertainty",
      summary: "Financial markets continue to navigate through uncertain economic conditions with mixed sector performance.",
      category: 'latest',
      impact: 'neutral',
      affectedSectors: ['Technology', 'Financials'],
      affectedStocks: ['SPY', 'QQQ'],
      publishedAt: new Date().toISOString(),
      source: 'Market Analysis',
      url: '#'
    },
    {
      id: 2,
      title: "Technology Sector Maintains Growth Momentum",
      summary: "Technology companies continue to show strong fundamentals despite market volatility.",
      category: 'latest',
      impact: 'positive',
      affectedSectors: ['Technology'],
      affectedStocks: ['AAPL', 'MSFT', 'GOOGL'],
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      source: 'Tech Daily',
      url: '#'
    }
  ];
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
      sectorData,
      source: 'alpha-vantage'
    };
  } catch (err) {
    console.error('Alpha Vantage sector sentiment error:', err);
    // Enhanced fallback with more realistic data
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
        fearGreedIndex: 50,
        volatilityIndex: 20.0
      },
      sectorData: mockSectorData,
      source: 'fallback'
    };
  }
}

// Get trending topics
router.get('/trending', async (req, res) => {
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

// Get trending topics from NewsAPI
async function getTrendingTopicsFromNewsAPI() {
  try {
    const news = await getMarketNews();
    const topicCounts = {};
    
    news.forEach(article => {
      if (article.title) {
        const words = article.title.split(/\W+/).filter(w => w.length > 4);
        words.forEach(word => {
          const key = word.toLowerCase();
          topicCounts[key] = (topicCounts[key] || 0) + 1;
        });
      }
    });

    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, mentions]) => ({
        topic,
        mentions,
        sentiment: 'neutral',
        impact: mentions > 3 ? 'medium' : 'low'
      }));
  } catch (error) {
    console.error('Trending topics error:', error);
    return [
      { topic: 'market', mentions: 5, sentiment: 'neutral', impact: 'medium' },
      { topic: 'technology', mentions: 4, sentiment: 'positive', impact: 'medium' },
      { topic: 'stocks', mentions: 3, sentiment: 'neutral', impact: 'low' }
    ];
  }
}

// Simple keyword-based sentiment analysis fallback
function getSimpleSentiment(text) {
  if (!text) return 'neutral';
  
  const lowerText = text.toLowerCase();
  
  // Positive keywords
  const positiveWords = [
    'growth', 'profit', 'gain', 'increase', 'rise', 'bull', 'bullish', 'optimistic',
    'positive', 'strong', 'surge', 'rally', 'boom', 'upward', 'recovery', 'upgrade',
    'beat', 'exceed', 'outperform', 'expansion', 'breakthrough', 'success'
  ];
  
  // Negative keywords  
  const negativeWords = [
    'loss', 'decline', 'fall', 'drop', 'bear', 'bearish', 'pessimistic',
    'negative', 'weak', 'crash', 'recession', 'downward', 'sell-off', 'downgrade',
    'miss', 'underperform', 'concern', 'risk', 'crisis', 'failure', 'collapse'
  ];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

module.exports = router;