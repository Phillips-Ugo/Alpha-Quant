# AWS Lambda Setup with Netlify Functions

This document explains the migration from Express.js backend to AWS Lambda functions using Netlify Functions for the Alpha Quant application.

## 🏗️ Architecture Overview

The application now uses a serverless architecture with:
- **Frontend**: React.js hosted on Netlify
- **Backend**: AWS Lambda functions via Netlify Functions
- **Data**: Real-time stock data from Yahoo Finance API
- **Authentication**: JWT-based auth with bcryptjs

## 📁 Project Structure

```
client/
├── netlify/
│   └── functions/
│       ├── auth.js          # Authentication (login/register)
│       ├── portfolio.js     # Portfolio management
│       ├── stocks.js        # Stock data and analysis
│       ├── news.js          # Financial news
│       ├── ai.js            # AI chat assistant
│       ├── upload.js        # File upload processing
│       └── market.js        # Market data and status
├── src/                     # React frontend
└── package.json
```

## 🔧 Configuration

### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = "build"
  base = "client"

[build.environment]
  NODE_VERSION = "18"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🚀 Netlify Functions

### 1. Authentication (`auth.js`)
**Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

**Features:**
- Password hashing with bcryptjs
- JWT token generation
- CORS support
- Input validation

### 2. Portfolio Management (`portfolio.js`)
**Endpoints:**
- `GET /api/portfolio` - Get portfolio data
- `POST /api/portfolio` - Add new stock

**Features:**
- Real-time stock price updates
- Portfolio analytics calculation
- Default portfolio generation
- Performance tracking

### 3. Stock Data (`stocks.js`)
**Endpoints:**
- `GET /api/stocks/quote?symbol=AAPL` - Get stock quote
- `GET /api/stocks/search?q=apple` - Search stocks
- `GET /api/stocks/history?symbol=AAPL` - Historical data
- `GET /api/stocks/market-overview` - Market indices
- `POST /api/stocks/analyze` - Stock analysis

**Features:**
- Real-time stock quotes
- Historical price data
- Technical analysis
- Market overview

### 4. News (`news.js`)
**Endpoints:**
- `GET /api/news` - Get all news
- `GET /api/news/ticker?symbol=AAPL` - News by ticker
- `GET /api/news/sentiment?symbol=AAPL` - Sentiment analysis
- `GET /api/news/trending` - Trending topics
- `GET /api/news/search?q=earnings` - Search news

**Features:**
- Financial news aggregation
- Sentiment analysis
- News filtering and search
- Trending topics

### 5. AI Chat (`ai.js`)
**Endpoints:**
- `POST /api/ai/chat` - Chat with AI
- `GET /api/ai/suggestions` - Get chat suggestions
- `GET /api/ai/capabilities` - AI capabilities

**Features:**
- Contextual responses
- Portfolio analysis
- Market insights
- Investment recommendations

### 6. File Upload (`upload.js`)
**Endpoints:**
- `POST /api/upload` - Upload portfolio file
- `GET /api/upload/template` - Get upload templates

**Features:**
- CSV and TXT file parsing
- Stock validation
- Portfolio import
- Error handling

### 7. Market Data (`market.js`)
**Endpoints:**
- `GET /api/market/status` - Market open/closed status
- `GET /api/market/overview` - Market overview
- `GET /api/market/sectors` - Sector performance

**Features:**
- Real-time market status
- Major indices tracking
- Sector performance
- Market timing

## 🔑 Environment Variables

Set these in your Netlify dashboard:

```bash
# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Financial News APIs (for real news data)
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
NEWS_API_KEY=your-news-api-key

# AI Services (for future enhancements)
OPENAI_API_KEY=your-openai-api-key

# CORS (optional)
CORS_ORIGIN=https://yourdomain.com
```

### API Key Setup

1. **Alpha Vantage API** (Free tier available):
   - Sign up at: https://www.alphavantage.co/support/#api-key
   - Provides real-time financial news with sentiment analysis
   - Free tier: 500 requests/day

2. **NewsAPI** (Alternative):
   - Sign up at: https://newsapi.org/register
   - Provides general news with financial filtering
   - Free tier: 1,000 requests/day

3. **Yahoo Finance** (No API key needed):
   - Used for real-time stock data and market information
   - Free and unlimited usage

## 📊 API Response Format

All functions return consistent JSON responses:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "data": null
}
```

## 🧪 Testing Functions Locally

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Start local development:
```bash
netlify dev
```

3. Test functions:
```bash
curl http://localhost:8888/.netlify/functions/portfolio
```

## 🚀 Deployment

1. **Automatic Deployment**: Push to main branch triggers Netlify build
2. **Manual Deployment**: Use Netlify CLI
```bash
netlify deploy --prod
```

## 📈 Benefits of Serverless Architecture

### ✅ Advantages
- **Scalability**: Automatic scaling based on demand
- **Cost-Effective**: Pay only for actual usage
- **Maintenance**: No server management required
- **Performance**: Global CDN distribution
- **Security**: Built-in security features

### ⚠️ Considerations
- **Cold Starts**: Initial function execution may be slower
- **Timeout Limits**: Functions have execution time limits
- **State Management**: No persistent server state
- **Vendor Lock-in**: Tied to Netlify/AWS ecosystem

## 🔄 Migration from Express.js

### What Changed
1. **Routes → Functions**: Express routes converted to Lambda functions
2. **Middleware → Function Logic**: CORS, validation moved into functions
3. **File System → Stateless**: No persistent file storage
4. **Sessions → JWT**: Stateless authentication

### What Stayed the Same
1. **API Endpoints**: Same URL structure
2. **Response Format**: Consistent JSON responses
3. **Business Logic**: Core functionality preserved
4. **Frontend**: No changes required

## 🛠️ Development Workflow

1. **Local Development**:
   ```bash
   cd client
   npm run start
   netlify dev
   ```

2. **Testing**:
   ```bash
   npm test
   npm run build
   ```

3. **Deployment**:
   ```bash
   git add .
   git commit -m "Update functions"
   git push origin main
   ```

## 📚 Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Yahoo Finance API](https://github.com/gadicc/node-yahoo-finance2)
- [JWT Authentication](https://jwt.io/)

## 🆘 Troubleshooting

### Common Issues

1. **Function Timeout**:
   - Optimize function code
   - Use async/await properly
   - Consider breaking into smaller functions

2. **CORS Errors**:
   - Check headers in function responses
   - Verify origin settings

3. **Dependencies**:
   - Ensure all dependencies are in package.json
   - Check for missing modules

4. **Environment Variables**:
   - Verify variables are set in Netlify dashboard
   - Check for typos in variable names

### Debug Tips

1. **Check Function Logs**:
   ```bash
   netlify functions:list
   netlify functions:invoke function-name
   ```

2. **Local Testing**:
   ```bash
   netlify dev --debug
   ```

3. **Production Debugging**:
   - Use Netlify dashboard function logs
   - Check browser network tab for errors

## 🎯 Next Steps

1. **Database Integration**: Add DynamoDB or MongoDB
2. **Real-time Updates**: Implement WebSocket connections
3. **Advanced AI**: Integrate OpenAI GPT models
4. **Analytics**: Add user analytics and tracking
5. **Caching**: Implement Redis for performance
6. **Monitoring**: Add CloudWatch monitoring

---

This setup provides a modern, scalable, and cost-effective backend for the Alpha Quant application using AWS Lambda functions via Netlify.
