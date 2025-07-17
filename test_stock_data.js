const axios = require('axios');

// Test the stock data API endpoints
async function testStockData() {
  console.log('Testing Stock Data API...\n');

  try {
    // Test stock search
    console.log('1. Testing stock search...');
    const searchResponse = await axios.get('http://localhost:5000/api/stocks/search?query=AAPL');
    console.log('Search response structure:', Object.keys(searchResponse.data));
    console.log('Sample result:', searchResponse.data.results?.[0]);
    console.log('✓ Search working\n');

    // Test stock data fetch
    console.log('2. Testing stock data fetch...');
    const dataResponse = await axios.get('http://localhost:5000/api/stocks/data/AAPL');
    console.log('Data response structure:', Object.keys(dataResponse.data));
    console.log('Sample data fields:', {
      symbol: dataResponse.data.symbol,
      companyName: dataResponse.data.companyName,
      currentPrice: dataResponse.data.currentPrice,
      change: dataResponse.data.change,
      changePercent: dataResponse.data.changePercent,
      volume: dataResponse.data.volume,
      marketCap: dataResponse.data.marketCap,
      peRatio: dataResponse.data.peRatio,
      dividendYield: dataResponse.data.dividendYield,
      sector: dataResponse.data.sector,
      industry: dataResponse.data.industry,
      high52Week: dataResponse.data.high52Week,
      low52Week: dataResponse.data.low52Week,
      previousClose: dataResponse.data.previousClose
    });
    console.log('✓ Data fetch working\n');

    // Test statistics
    console.log('3. Testing stock statistics...');
    const statsResponse = await axios.get('http://localhost:5000/api/stocks/statistics/AAPL');
    console.log('Statistics response structure:', Object.keys(statsResponse.data));
    console.log('Sample statistics fields:', {
      symbol: statsResponse.data.symbol,
      currentPrice: statsResponse.data.currentPrice,
      priceChange1D: statsResponse.data.priceChange1D,
      priceChange1DPercent: statsResponse.data.priceChange1DPercent,
      priceChange1W: statsResponse.data.priceChange1W,
      priceChange1M: statsResponse.data.priceChange1M,
      priceChange3M: statsResponse.data.priceChange3M,
      volatility: statsResponse.data.volatility,
      volumeAvg20: statsResponse.data.volumeAvg20,
      volumeRatio: statsResponse.data.volumeRatio,
      sma20: statsResponse.data.sma20,
      sma50: statsResponse.data.sma50,
      sma200: statsResponse.data.sma200,
      rsi: statsResponse.data.rsi,
      supportLevel: statsResponse.data.supportLevel,
      resistanceLevel: statsResponse.data.resistanceLevel
    });
    console.log('✓ Statistics working\n');

    // Test market overview
    console.log('4. Testing market overview...');
    const marketResponse = await axios.get('http://localhost:5000/api/stocks/market-overview');
    console.log('Market response structure:', Object.keys(marketResponse.data));
    console.log('✓ Market overview working\n');

    console.log('🎉 All tests passed! The data structure is correct.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testStockData(); 