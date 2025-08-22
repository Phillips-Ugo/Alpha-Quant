# 🚀 Deployment Guide - Alpha Quant Backend

This guide will help you get your Alpha Quant application fully deployed and running with real data and LSTM predictions.

## 📋 Prerequisites

1. **Netlify Account** - Sign up at [netlify.com](https://netlify.com)
2. **GitHub Repository** - Your code should be pushed to GitHub
3. **API Keys** (Optional but recommended for full functionality)

## 🔧 Step 1: Deploy to Netlify

### Option A: Automatic Deployment (Recommended)

1. **Connect GitHub to Netlify:**
   - Go to [netlify.com](https://netlify.com) and sign in
   - Click "New site from Git"
   - Choose "GitHub" and authorize Netlify
   - Select your `Alpha-Quant` repository

2. **Configure Build Settings:**
   ```
   Build command: npm run build
   Publish directory: client/build
   Base directory: client
   ```

3. **Deploy:**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site

### Option B: Manual Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
cd client
netlify init
netlify deploy --prod
```

## 🔑 Step 2: Configure Environment Variables

In your Netlify dashboard, go to **Site settings > Environment variables** and add:

```bash
# Required for authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Optional: For real news data
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
NEWS_API_KEY=your-news-api-key

# Optional: For LSTM model integration
LSTM_API_URL=https://your-lstm-api-url.com
CLOUD_ML_URL=https://your-cloud-ml-url.com
```

### Getting API Keys:

1. **Alpha Vantage** (Free):
   - Sign up at: https://www.alphavantage.co/support/#api-key
   - Free tier: 500 requests/day

2. **NewsAPI** (Alternative):
   - Sign up at: https://newsapi.org/register
   - Free tier: 1,000 requests/day

## 🧠 Step 3: LSTM Model Integration

### Option A: Deploy LSTM Model Separately (Recommended)

1. **Deploy your LSTM model to a cloud service:**

   **Google Cloud Run:**
   ```bash
   # Create a simple Flask API for your LSTM model
   cd ml
   pip install flask gunicorn
   
   # Create app.py
   from flask import Flask, request, jsonify
   import your_lstm_model  # Import your existing model
   
   app = Flask(__name__)
   
   @app.route('/predict', methods=['POST'])
   def predict():
       data = request.json
       symbol = data['symbol']
       days_ahead = data.get('days_ahead', 30)
       
       # Call your LSTM model
       prediction = your_lstm_model.predict(symbol, days_ahead)
       
       return jsonify(prediction)
   
   if __name__ == '__main__':
       app.run(host='0.0.0.0', port=8080)
   ```

   **Deploy to Google Cloud Run:**
   ```bash
   gcloud run deploy lstm-api --source . --platform managed --region us-central1
   ```

2. **Set the LSTM API URL in Netlify:**
   ```
   LSTM_API_URL=https://your-lstm-api-url.run.app
   ```

### Option B: Use Technical Analysis Fallback

If you don't deploy the LSTM model, the system will automatically use technical analysis as a fallback. This still provides:
- Moving averages (SMA 20, 50)
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Volatility calculations
- Price predictions based on technical indicators

## 🔍 Step 4: Test Your Deployment

### Test API Endpoints:

1. **Health Check:**
   ```bash
   curl https://your-site.netlify.app/.netlify/functions/stocks/health
   ```

2. **Stock Quote:**
   ```bash
   curl "https://your-site.netlify.app/.netlify/functions/stocks/quote?symbol=AAPL"
   ```

3. **Stock Analysis:**
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/stocks/analyze \
     -H "Content-Type: application/json" \
     -d '{"ticker": "AAPL", "daysAhead": 30}'
   ```

4. **LSTM Prediction:**
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/lstm-predict \
     -H "Content-Type: application/json" \
     -d '{"symbol": "AAPL", "daysAhead": 30}'
   ```

### Test Frontend:

1. Visit your Netlify URL: `https://your-site.netlify.app`
2. Navigate to different pages and test functionality
3. Check browser console for any errors

## 🐛 Step 5: Troubleshooting

### Common Issues:

1. **API Data Not Loading:**
   - Check Netlify function logs in the dashboard
   - Verify environment variables are set correctly
   - Test API endpoints directly

2. **CORS Errors:**
   - Functions already include CORS headers
   - Check if you're using the correct API base URL

3. **LSTM Predictions Not Working:**
   - Verify LSTM_API_URL is set correctly
   - Check if your LSTM model API is accessible
   - The system will fallback to technical analysis

4. **Build Failures:**
   - Check Netlify build logs
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

### Debug Functions Locally:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start local development
cd client
netlify dev

# Test functions locally
curl http://localhost:8888/.netlify/functions/stocks/health
```

## 📊 Step 6: Monitor Performance

### Netlify Analytics:
- Go to your Netlify dashboard
- Check "Analytics" tab for site performance
- Monitor function execution times

### Function Logs:
- Go to "Functions" tab in Netlify dashboard
- Check execution logs for errors
- Monitor function performance

## 🎯 Step 7: Production Optimization

### Performance Tips:

1. **Enable Caching:**
   - Add cache headers to function responses
   - Use CDN for static assets

2. **Optimize Functions:**
   - Keep functions lightweight
   - Use async/await properly
   - Handle errors gracefully

3. **Monitor Usage:**
   - Check Netlify usage limits
   - Monitor API rate limits
   - Optimize function calls

## 🔄 Step 8: Continuous Deployment

### Automatic Updates:
- Push to `main` branch triggers automatic deployment
- Netlify will rebuild and deploy automatically
- Environment variables persist across deployments

### Manual Updates:
```bash
# Make changes locally
git add .
git commit -m "Update functions"
git push origin main

# Netlify will automatically deploy
```

## ✅ Verification Checklist

- [ ] Site deployed to Netlify
- [ ] Environment variables configured
- [ ] API endpoints responding
- [ ] Stock data loading
- [ ] News data working (if API keys set)
- [ ] LSTM predictions working (or fallback active)
- [ ] Frontend functionality working
- [ ] No console errors
- [ ] Performance acceptable

## 🆘 Getting Help

If you encounter issues:

1. **Check Netlify logs** in the dashboard
2. **Test API endpoints** directly
3. **Verify environment variables** are set
4. **Check browser console** for frontend errors
5. **Review function code** for syntax errors

## 🎉 Success!

Once all steps are completed, your Alpha Quant application will be fully functional with:
- ✅ Real-time stock data
- ✅ Live financial news
- ✅ AI-powered analysis
- ✅ LSTM predictions (or technical analysis fallback)
- ✅ Portfolio management
- ✅ Market insights

Your application is now ready for production use! 🚀
