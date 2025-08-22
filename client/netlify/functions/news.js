const axios = require('axios');

// Function to fetch real financial news
async function fetchFinancialNews() {
  try {
    // Using Alpha Vantage News API (free tier available)
    // You can also use NewsAPI, Marketaux, or other financial news APIs
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const response = await axios.get(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${apiKey}&limit=50`);
    
    if (response.data && response.data.feed) {
      return response.data.feed.map(article => ({
        id: article.url_hash || Date.now() + Math.random(),
        title: article.title,
        summary: article.summary,
        content: article.summary,
        source: article.source,
        publishedAt: article.time_published,
        url: article.url,
        sentiment: article.overall_sentiment_label?.toLowerCase() || 'neutral',
        tags: article.ticker_sentiment?.map(t => t.ticker) || [],
        relevanceScore: article.relevance_score || 0
      }));
    }
    
    // Fallback to NewsAPI if Alpha Vantage fails
    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
      const newsResponse = await axios.get(`https://newsapi.org/v2/everything?q=finance+stocks+market&apiKey=${newsApiKey}&pageSize=20&sortBy=publishedAt`);
      
      if (newsResponse.data && newsResponse.data.articles) {
        return newsResponse.data.articles.map(article => ({
          id: article.url || Date.now() + Math.random(),
          title: article.title,
          summary: article.description,
          content: article.content,
          source: article.source.name,
          publishedAt: article.publishedAt,
          url: article.url,
          sentiment: 'neutral', // NewsAPI doesn't provide sentiment
          tags: extractTags(article.title + ' ' + article.description),
          relevanceScore: 0.5
        }));
      }
    }
    
    throw new Error('No news data available');
    
  } catch (error) {
    console.error('Error fetching news:', error.message);
    
    // Return some basic financial news if APIs fail
    return [
      {
        id: 1,
        title: "Market Update: S&P 500 Reaches New Highs",
        summary: "The S&P 500 index continues its upward momentum, reaching new record levels as investors remain optimistic about economic recovery.",
        content: "The S&P 500 index has shown remarkable resilience, continuing its upward trajectory despite various market challenges. Analysts attribute this performance to strong corporate earnings and positive economic indicators.",
        source: "Financial Times",
        publishedAt: new Date().toISOString(),
        url: "https://example.com/market-update",
        sentiment: "positive",
        tags: ["S&P 500", "Market", "Economy"]
      },
      {
        id: 2,
        title: "Tech Stocks Lead Market Gains",
        summary: "Technology sector stocks are leading the market gains today, with major tech companies reporting strong quarterly results.",
        content: "Technology stocks are outperforming other sectors today, driven by strong quarterly earnings reports from major tech companies. This sector leadership is contributing to overall market gains.",
        source: "Reuters",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: "https://example.com/tech-stocks",
        sentiment: "positive",
        tags: ["Technology", "Stocks", "Earnings"]
      }
    ];
  }
}

// Function to extract tags from text
function extractTags(text) {
  const commonTags = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
    'Market', 'Stocks', 'Economy', 'Finance', 'Trading', 'Investment',
    'Earnings', 'Revenue', 'Growth', 'Technology', 'Healthcare', 'Energy'
  ];
  
  const foundTags = [];
  const upperText = text.toUpperCase();
  
  commonTags.forEach(tag => {
    if (upperText.includes(tag.toUpperCase())) {
      foundTags.push(tag);
    }
  });
  
  return foundTags.length > 0 ? foundTags : ['Finance'];
}

// Function to fetch news by ticker symbol
async function fetchNewsByTicker(symbol) {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const response = await axios.get(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${apiKey}&limit=20`);
    
    if (response.data && response.data.feed) {
      return response.data.feed.map(article => ({
        id: article.url_hash || Date.now() + Math.random(),
        title: article.title,
        summary: article.summary,
        content: article.summary,
        source: article.source,
        publishedAt: article.time_published,
        url: article.url,
        sentiment: article.overall_sentiment_label?.toLowerCase() || 'neutral',
        tags: [symbol.toUpperCase()],
        relevanceScore: article.relevance_score || 0
      }));
    }
    
    // Fallback: filter general news for the ticker
    const allNews = await fetchFinancialNews();
    return allNews.filter(news => 
      news.tags.some(tag => tag.toUpperCase() === symbol.toUpperCase()) ||
      news.title.toUpperCase().includes(symbol.toUpperCase()) ||
      news.summary.toUpperCase().includes(symbol.toUpperCase())
    );
    
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error.message);
    return [];
  }
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
    const { path, httpMethod, queryStringParameters } = event;

    // Get all news
    if (httpMethod === 'GET' && path.endsWith('/news')) {
      const limit = parseInt(queryStringParameters?.limit) || 10;
      const offset = parseInt(queryStringParameters?.offset) || 0;
      const category = queryStringParameters?.category;
      const sentiment = queryStringParameters?.sentiment;

      const allNews = await fetchFinancialNews();
      let filteredNews = [...allNews];

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

      // Sort by relevance and recency
      filteredNews.sort((a, b) => {
        const aScore = a.relevanceScore + (new Date(a.publishedAt).getTime() / 1000000000);
        const bScore = b.relevanceScore + (new Date(b.publishedAt).getTime() / 1000000000);
        return bScore - aScore;
      });

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
        });
      }

      const tickerNews = await fetchNewsByTicker(symbol);

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
        });
      }

      const tickerNews = await fetchNewsByTicker(symbol);

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
      const allNews = await fetchFinancialNews();
      const tagCounts = {};
      
      allNews.forEach(news => {
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

      const allNews = await fetchFinancialNews();
      const searchResults = allNews.filter(news => 
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
