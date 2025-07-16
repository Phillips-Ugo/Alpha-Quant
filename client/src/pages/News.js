import React, { useState, useEffect } from 'react';
import { 
  NewspaperIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const News = () => {
  const [news, setNews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [portfolio, setPortfolio] = useState(null);

  useEffect(() => {
    fetchNewsData();
    fetchPortfolio();
  }, []);

  useEffect(() => {
    if (portfolio) {
      fetchRecommendations();
    }
  }, [portfolio]);

  const fetchNewsData = async () => {
    try {
      const [newsRes, sentimentRes, trendingRes] = await Promise.all([
        axios.get('/api/news'),
        axios.get('/api/news/sentiment'),
        axios.get('/api/news/trending')
      ]);

      setNews(newsRes.data.news);
      setSentiment(sentimentRes.data.sentiment);
      setTrending(trendingRes.data.trending);
    } catch (error) {
      console.error('Failed to fetch news data:', error);
      toast.error('Failed to load news data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get('/api/portfolio');
      setPortfolio(response.data);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get('/api/news/recommendations', {
        params: { portfolio: JSON.stringify(portfolio.portfolio) }
      });
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'mixed': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentColor = (score) => {
    if (score >= 0.6) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const categories = [
    { id: 'all', name: 'All News' },
    { id: 'monetary-policy', name: 'Monetary Policy' },
    { id: 'earnings', name: 'Earnings' },
    { id: 'technology', name: 'Technology' },
    { id: 'commodities', name: 'Commodities' },
    { id: 'inflation', name: 'Inflation' }
  ];

  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(item => item.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-quant-gold font-mono drop-shadow-lg">QuantaVista News & Market Events</h1>
          <p className="text-quant-green font-mono">Stay informed about market trends and their impact on your portfolio</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Sentiment */}
          {sentiment && (
            <div className="card-quant">
              <h3 className="text-lg font-semibold text-quant-gold mb-4">Market Sentiment</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-quant-green">Overall</p>
                  <p className={`text-lg font-semibold ${getSentimentColor(sentiment.score)}`}>{sentiment.overall}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-quant-green">Fear & Greed</p>
                  <p className="text-lg font-semibold text-quant-gold">{sentiment.indicators.fearGreedIndex}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-quant-green">Volatility</p>
                  <p className="text-lg font-semibold text-quant-gold">{sentiment.indicators.volatilityIndex}</p>
                </div>
              </div>
            </div>
          )}

          {/* Trending Topics */}
          {trending.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <FireIcon className="h-5 w-5 text-orange-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Trending Topics</h3>
              </div>
              <div className="space-y-3">
                {trending.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{topic.topic}</p>
                      <p className="text-sm text-gray-600">{topic.mentions} mentions</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(topic.sentiment)}`}>
                        {topic.sentiment}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        topic.impact === 'high' ? 'bg-red-100 text-red-600' : 
                        topic.impact === 'medium' ? 'bg-yellow-100 text-yellow-600' : 
                        'bg-green-100 text-green-600'
                      }`}>
                        {topic.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* News Feed */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Latest News</h3>
                <div className="flex space-x-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredNews.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(item.impact)}`}>
                          {item.impact}
                        </span>
                        <span className="text-sm text-gray-500">{item.source}</span>
                        <span className="text-sm text-gray-500 flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatTimeAgo(item.publishedAt)}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h4>
                      <p className="text-gray-600 mb-3">{item.summary}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Affected Sectors: {item.affectedSectors.join(', ')}</span>
                        <span>Stocks: {item.affectedStocks.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h3>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                  <p className="text-sm text-blue-600 font-medium">{rec.action}</p>
                  {rec.affectedStocks.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Affected: {rec.affectedStocks.join(', ')}</p>
                    </div>
                  )}
                </div>
              ))}
              {recommendations.length === 0 && (
                <p className="text-gray-500 text-sm">No specific recommendations at this time.</p>
              )}
            </div>
          </div>

          {/* Sector Performance */}
          {sentiment && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sector Sentiment</h3>
              <div className="space-y-3">
                {Object.entries(sentiment.breakdown).map(([sector, score]) => (
                  <div key={sector} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {sector}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${score * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {(score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Trends */}
          {sentiment && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Trends</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Short Term</span>
                  <span className={`text-sm font-medium capitalize ${
                    sentiment.trends.shortTerm === 'bullish' ? 'text-green-600' : 
                    sentiment.trends.shortTerm === 'bearish' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {sentiment.trends.shortTerm}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Medium Term</span>
                  <span className={`text-sm font-medium capitalize ${
                    sentiment.trends.mediumTerm === 'bullish' ? 'text-green-600' : 
                    sentiment.trends.mediumTerm === 'bearish' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {sentiment.trends.mediumTerm}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Long Term</span>
                  <span className={`text-sm font-medium capitalize ${
                    sentiment.trends.longTerm === 'bullish' ? 'text-green-600' : 
                    sentiment.trends.longTerm === 'bearish' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {sentiment.trends.longTerm}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default News; 