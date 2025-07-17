const yahooFinance = require('yahoo-finance2').default;
const axios = require('axios');

class YahooFinanceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get real-time stock quote
  async getStockQuote(symbol) {
    try {
      const cacheKey = `quote_${symbol}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const quote = await yahooFinance.quote(symbol);
      
      const result = {
        symbol: quote.symbol,
        companyName: quote.longName || quote.shortName || symbol,
        currentPrice: quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose,
        change: quote.regularMarketPrice - quote.regularMarketPreviousClose,
        changePercent: quote.regularMarketChangePercent,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        peRatio: quote.trailingPE,
        dividendYield: quote.dividendYield,
        sector: quote.sector,
        industry: quote.industry,
        high52Week: quote.fiftyTwoWeekHigh,
        low52Week: quote.fiftyTwoWeekLow,
        open: quote.regularMarketOpen,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        timestamp: new Date().toISOString()
      };

      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw new Error(`Failed to fetch data for ${symbol}`);
    }
  }

  // Get historical data
  async getHistoricalData(symbol, period = '1y', interval = '1d') {
    try {
      const cacheKey = `history_${symbol}_${period}_${interval}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const history = await yahooFinance.historical(symbol, {
        period: period,
        interval: interval
      });

      const result = {
        symbol: symbol,
        data: history.map(item => ({
          date: item.date.toISOString().split('T')[0],
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          adjClose: item.adjClose
        })),
        period: period,
        interval: interval
      };

      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error);
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
  }

  // Get multiple stock quotes
  async getMultipleQuotes(symbols) {
    try {
      const quotes = await Promise.all(
        symbols.map(symbol => this.getStockQuote(symbol))
      );
      return quotes;
    } catch (error) {
      console.error('Error fetching multiple quotes:', error);
      throw new Error('Failed to fetch multiple stock quotes');
    }
  }

  // Search for stocks
  async searchStocks(query) {
    try {
      const cacheKey = `search_${query}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      // Use Yahoo Finance search
      const searchResults = await yahooFinance.search(query);
      
      const results = searchResults.quotes.map(quote => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname,
        exchange: quote.exchange,
        type: quote.quoteType,
        score: quote.score
      }));

      const result = {
        query: query,
        results: results.slice(0, 10) // Limit to top 10 results
      };

      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Error searching for ${query}:`, error);
      throw new Error('Failed to search stocks');
    }
  }

  // Get market overview
  async getMarketOverview() {
    try {
      const cacheKey = 'market_overview';
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      // Get major indices
      const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT'];
      const indexQuotes = await this.getMultipleQuotes(indices);

      const marketData = {
        indices: {
          sp500: this.formatIndexData(indexQuotes.find(q => q.symbol === '^GSPC')),
          dowJones: this.formatIndexData(indexQuotes.find(q => q.symbol === '^DJI')),
          nasdaq: this.formatIndexData(indexQuotes.find(q => q.symbol === '^IXIC')),
          russell2000: this.formatIndexData(indexQuotes.find(q => q.symbol === '^RUT'))
        },
        timestamp: new Date().toISOString()
      };

      this.setCached(cacheKey, marketData);
      return marketData;
    } catch (error) {
      console.error('Error fetching market overview:', error);
      throw new Error('Failed to fetch market overview');
    }
  }

  // Get stock statistics and technical indicators
  async getStockStatistics(symbol) {
    try {
      const cacheKey = `stats_${symbol}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const [quote, history] = await Promise.all([
        this.getStockQuote(symbol),
        this.getHistoricalData(symbol, '6mo', '1d')
      ]);

      // Validate data
      if (!history.data || history.data.length === 0) {
        throw new Error('No historical data available');
      }

      // Calculate technical indicators
      const prices = history.data.map(d => d.close).filter(p => p && !isNaN(p));
      const volumes = history.data.map(d => d.volume).filter(v => v && !isNaN(v));

      if (prices.length === 0) {
        throw new Error('No valid price data available');
      }

      const stats = {
        symbol: symbol,
        currentPrice: quote.currentPrice,
        priceChange1D: quote.change,
        priceChange1DPercent: quote.changePercent,
        priceChange1W: this.calculatePriceChange(prices, 5),
        priceChange1M: this.calculatePriceChange(prices, 21),
        priceChange3M: this.calculatePriceChange(prices, 63),
        volatility: this.calculateVolatility(prices, 20),
        volumeAvg20: this.calculateAverageVolume(volumes, 20),
        volumeRatio: this.calculateAverageVolume(volumes, 20) > 0 ? volumes[volumes.length - 1] / this.calculateAverageVolume(volumes, 20) : 0,
        sma20: this.calculateSMA(prices, 20),
        sma50: this.calculateSMA(prices, 50),
        sma200: this.calculateSMA(prices, 200),
        rsi: this.calculateRSI(prices, 14),
        supportLevel: this.calculateSupportLevel(prices),
        resistanceLevel: this.calculateResistanceLevel(prices),
        fundamentals: {
          marketCap: quote.marketCap,
          peRatio: quote.peRatio,
          dividendYield: quote.dividendYield,
          sector: quote.sector,
          industry: quote.industry
        }
      };

      this.setCached(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error(`Error calculating statistics for ${symbol}:`, error);
      throw new Error(`Failed to calculate statistics for ${symbol}`);
    }
  }

  // Calculate portfolio value and performance
  async calculatePortfolioValue(holdings) {
    try {
      if (!holdings || holdings.length === 0) {
        return {
          totalValue: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          holdings: []
        };
      }

      const symbols = holdings.map(h => h.symbol);
      const quotes = await this.getMultipleQuotes(symbols);

      let totalValue = 0;
      let totalCost = 0;
      const updatedHoldings = [];

      for (let i = 0; i < holdings.length; i++) {
        const holding = holdings[i];
        const quote = quotes.find(q => q.symbol === holding.symbol);
        
        if (quote) {
          const currentValue = holding.shares * quote.currentPrice;
          const costBasis = holding.shares * holding.avgPrice;
          const gainLoss = currentValue - costBasis;
          const gainLossPercent = (gainLoss / costBasis) * 100;

          totalValue += currentValue;
          totalCost += costBasis;

          updatedHoldings.push({
            ...holding,
            currentPrice: quote.currentPrice,
            currentValue: currentValue,
            gainLoss: gainLoss,
            gainLossPercent: gainLossPercent,
            dayChange: holding.shares * quote.change,
            dayChangePercent: quote.changePercent
          });
        }
      }

      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

      return {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        holdings: updatedHoldings,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating portfolio value:', error);
      throw new Error('Failed to calculate portfolio value');
    }
  }

  // Helper methods
  formatIndexData(quote) {
    if (!quote) return null;
    return {
      symbol: quote.symbol,
      name: quote.companyName,
      price: quote.currentPrice,
      change: quote.change,
      changePercent: quote.changePercent
    };
  }

  calculatePriceChange(prices, days) {
    if (prices.length < days) return 0;
    const current = prices[prices.length - 1];
    const previous = prices[prices.length - days - 1];
    return ((current - previous) / previous) * 100;
  }

  calculateVolatility(prices, period) {
    if (prices.length < period) return 0;
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const recentReturns = returns.slice(-period);
    const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
    const variance = recentReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentReturns.length;
    return Math.sqrt(variance) * 100;
  }

  calculateAverageVolume(volumes, period) {
    if (volumes.length < period) return 0;
    const recentVolumes = volumes.slice(-period);
    return recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  }

  calculateSMA(prices, period) {
    if (prices.length < period) return 0;
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  }

  calculateRSI(prices, period) {
    if (prices.length < period + 1) return 50;
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateSupportLevel(prices) {
    if (prices.length < 20) return prices[prices.length - 1];
    const recentPrices = prices.slice(-20);
    return Math.min(...recentPrices);
  }

  calculateResistanceLevel(prices) {
    if (prices.length < 20) return prices[prices.length - 1];
    const recentPrices = prices.slice(-20);
    return Math.max(...recentPrices);
  }

  // Cache management
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCached(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new YahooFinanceService(); 