const axios = require('axios');

// Mock news data for now (in production, you'd use a real news API)
const mockNewsData = [
  {
    id: 1,
    title: "Apple Reports Strong Q4 Earnings, Stock Rises 3%",
    summary: "Apple Inc. reported better-than-expected quarterly earnings, driven by strong iPhone sales and services revenue growth.",
    content: "Apple Inc. (AAPL) today announced financial results for its fiscal 2024 fourth quarter ended September 28, 2024. The Company posted quarterly revenue of $89.5 billion, up 8 percent year over year, and quarterly earnings per diluted share of $1.46, up 13 percent year over year.",
    source: "Reuters",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    url: "https://example.com/apple-earnings",
    sentiment: "positive",
    tags: ["AAPL", "Earnings", "Technology"]
  },
  {
    id: 2,
    title: "Federal Reserve Signals Potential Rate Cuts in 2024",
    summary: "The Federal Reserve indicated it may consider interest rate cuts next year as inflation continues to moderate.",
    content: "Federal Reserve officials signaled Wednesday that they expect to cut interest rates three times next year, a sign that the central bank thinks it has made significant progress in its fight against inflation.",
    source: "Bloomberg",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    url: "https://example.com/fed-rate-cuts",
    sentiment: "positive",
    tags: ["Federal Reserve", "Interest Rates", "Economy"]
  },
  {
    id: 3,
    title: "Tesla Faces Production Challenges at Gigafactory",
    summary: "Tesla Inc. reported production delays at its Berlin Gigafactory due to supply chain issues.",
    content: "Tesla Inc. (TSLA) has encountered production challenges at its Gigafactory Berlin-Brandenburg facility, with supply chain disruptions causing delays in vehicle assembly.",
    source: "CNBC",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    url: "https://example.com/tesla-production",
    sentiment: "negative",
    tags: ["TSLA", "Production", "Automotive"]
  },
  {
    id: 4,
    title: "Microsoft Cloud Services Revenue Surges 25%",
    summary: "Microsoft Corporation reported strong growth in its cloud computing division, beating analyst expectations.",
    content: "Microsoft Corp. (MSFT) reported fiscal first-quarter results that beat Wall Street expectations, driven by strong growth in its cloud computing business.",
    source: "MarketWatch",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    url: "https://example.com/microsoft-cloud",
    sentiment: "positive",
    tags: ["MSFT", "Cloud Computing", "Technology"]
  },
  {
    id: 5,
    title: "NVIDIA Announces New AI Chip Architecture",
    summary: "NVIDIA Corporation unveiled its next-generation AI chip architecture, promising significant performance improvements.",
    content: "NVIDIA Corp. (NVDA) today announced its latest AI chip architecture, designed to accelerate artificial intelligence workloads and machine learning applications.",
    source: "TechCrunch",
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    url: "https://example.com/nvidia-ai-chip",
    sentiment: "positive",
    tags: ["NVDA", "AI", "Technology"]
  }
];

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
    const { path, httpMethod, queryStringParameters } = event;

    // Get all news
    if (httpMethod === 'GET' && path.endsWith('/news')) {
      const limit = parseInt(queryStringParameters?.limit) || 10;
      const offset = parseInt(queryStringParameters?.offset) || 0;
      const category = queryStringParameters?.category;
      const sentiment = queryStringParameters?.sentiment;

      let filteredNews = [...mockNewsData];

      // Filter by category
      if (category) {
        filteredNews = filteredNews.filter(news => 
          news.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
        );
      }

      // Filter by sentiment
      if (sentiment) {
        filteredNews = filteredNews.filter(news => 
          news.sentiment === sentiment.toLowerCase()
        );
      }

      // Apply pagination
      const paginatedNews = filteredNews.slice(offset, offset + limit);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            news: paginatedNews,
            total: filteredNews.length,
            limit,
            offset
          }
        })
      };
    }

    // Get news by ticker symbol
    if (httpMethod === 'GET' && path.includes('/news/ticker')) {
      const symbol = queryStringParameters?.symbol;
      
      if (!symbol) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Symbol parameter is required'
          })
        };
      }

      const tickerNews = mockNewsData.filter(news => 
        news.tags.some(tag => tag.toUpperCase() === symbol.toUpperCase())
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            news: tickerNews,
            symbol: symbol.toUpperCase()
          }
        })
      };
    }

    // Get news sentiment analysis
    if (httpMethod === 'GET' && path.includes('/news/sentiment')) {
      const symbol = queryStringParameters?.symbol;
      
      if (!symbol) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Symbol parameter is required'
          })
        };
      }

      const tickerNews = mockNewsData.filter(news => 
        news.tags.some(tag => tag.toUpperCase() === symbol.toUpperCase())
      );

      const sentimentCounts = {
        positive: 0,
        negative: 0,
        neutral: 0
      };

      tickerNews.forEach(news => {
        sentimentCounts[news.sentiment]++;
      });

      const total = tickerNews.length;
      const sentimentScore = total > 0 ? 
        ((sentimentCounts.positive - sentimentCounts.negative) / total) * 100 : 0;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            symbol: symbol.toUpperCase(),
            sentimentScore: Math.round(sentimentScore * 100) / 100,
            sentimentBreakdown: sentimentCounts,
            totalArticles: total
          }
        })
      };
    }

    // Get trending topics
    if (httpMethod === 'GET' && path.includes('/news/trending')) {
      const tagCounts = {};
      
      mockNewsData.forEach(news => {
        news.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const trendingTopics = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: trendingTopics
        })
      };
    }

    // Search news
    if (httpMethod === 'GET' && path.includes('/news/search')) {
      const query = queryStringParameters?.q;
      
      if (!query) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Query parameter is required'
          })
        });
      }

      const searchResults = mockNewsData.filter(news => 
        news.title.toLowerCase().includes(query.toLowerCase()) ||
        news.summary.toLowerCase().includes(query.toLowerCase()) ||
        news.content.toLowerCase().includes(query.toLowerCase()) ||
        news.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            news: searchResults,
            query,
            total: searchResults.length
          }
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
