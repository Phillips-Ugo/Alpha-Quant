#!/usr/bin/env python3
"""
Stock Statistics and Chart Data Generator
This script generates statistical data and chart information for stock analysis
including rolling averages, technical indicators, and other relevant metrics.
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import warnings
warnings.filterwarnings('ignore')

def calculate_technical_indicators(df):
    """Calculate various technical indicators"""
    indicators = {}
    
    # Moving averages
    indicators['sma_20'] = df['Close'].rolling(window=20).mean().tolist()
    indicators['sma_50'] = df['Close'].rolling(window=50).mean().tolist()
    indicators['sma_200'] = df['Close'].rolling(window=200).mean().tolist()
    indicators['ema_12'] = df['Close'].ewm(span=12).mean().tolist()
    indicators['ema_26'] = df['Close'].ewm(span=26).mean().tolist()
    
    # Bollinger Bands
    sma_20 = df['Close'].rolling(window=20).mean()
    std_20 = df['Close'].rolling(window=20).std()
    indicators['bollinger_upper'] = (sma_20 + (std_20 * 2)).tolist()
    indicators['bollinger_lower'] = (sma_20 - (std_20 * 2)).tolist()
    indicators['bollinger_middle'] = sma_20.tolist()
    
    # RSI (Relative Strength Index)
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    indicators['rsi'] = (100 - (100 / (1 + rs))).tolist()
    
    # MACD
    ema_12 = df['Close'].ewm(span=12).mean()
    ema_26 = df['Close'].ewm(span=26).mean()
    indicators['macd'] = (ema_12 - ema_26).tolist()
    indicators['macd_signal'] = (ema_12 - ema_26).ewm(span=9).mean().tolist()
    indicators['macd_histogram'] = ((ema_12 - ema_26) - (ema_12 - ema_26).ewm(span=9).mean()).tolist()
    
    # Stochastic Oscillator
    low_14 = df['Low'].rolling(window=14).min()
    high_14 = df['High'].rolling(window=14).max()
    indicators['stoch_k'] = ((df['Close'] - low_14) / (high_14 - low_14) * 100).tolist()
    indicators['stoch_d'] = ((df['Close'] - low_14) / (high_14 - low_14) * 100).rolling(window=3).mean().tolist()
    
    # Volume indicators
    indicators['volume_sma'] = df['Volume'].rolling(window=20).mean().tolist()
    indicators['volume_ratio'] = (df['Volume'] / df['Volume'].rolling(window=20).mean()).tolist()
    
    # Price momentum
    indicators['momentum'] = (df['Close'] / df['Close'].shift(10)).fillna(0).tolist()
    
    # Volatility
    indicators['volatility'] = df['Close'].rolling(window=20).std().tolist()
    
    return indicators

def calculate_statistical_metrics(df):
    """Calculate statistical metrics for the stock"""
    metrics = {}
    
    # Basic statistics
    metrics['current_price'] = float(df['Close'].iloc[-1])
    metrics['price_change_1d'] = float(df['Close'].iloc[-1] - df['Close'].iloc[-2]) if len(df) > 1 else 0
    metrics['price_change_1w'] = float(df['Close'].iloc[-1] - df['Close'].iloc[-6]) if len(df) > 6 else 0
    metrics['price_change_1m'] = float(df['Close'].iloc[-1] - df['Close'].iloc[-21]) if len(df) > 21 else 0
    metrics['price_change_3m'] = float(df['Close'].iloc[-1] - df['Close'].iloc[-63]) if len(df) > 63 else 0
    metrics['price_change_1y'] = float(df['Close'].iloc[-1] - df['Close'].iloc[-252]) if len(df) > 252 else 0.0
    
    # Percentage changes
    metrics['price_change_1d_pct'] = float(((df['Close'].iloc[-1] - df['Close'].iloc[-2]) / df['Close'].iloc[-2]) * 100) if len(df) > 1 else 0
    metrics['price_change_1w_pct'] = float(((df['Close'].iloc[-1] - df['Close'].iloc[-6]) / df['Close'].iloc[-6]) * 100) if len(df) > 6 else 0
    metrics['price_change_1m_pct'] = float(((df['Close'].iloc[-1] - df['Close'].iloc[-21]) / df['Close'].iloc[-21]) * 100) if len(df) > 21 else 0
    metrics['price_change_3m_pct'] = float(((df['Close'].iloc[-1] - df['Close'].iloc[-63]) / df['Close'].iloc[-63]) * 100) if len(df) > 63 else 0
    metrics['price_change_1y_pct'] = float(((df['Close'].iloc[-1] - df['Close'].iloc[-252]) / df['Close'].iloc[-252]) * 100) if len(df) > 252 else 0.0 
    # Volatility metrics
    returns = df['Close'].pct_change().dropna()
    metrics['volatility_20d'] = float(returns.rolling(window=20).std().iloc[-1] * np.sqrt(252)) if len(returns) >= 20 else 0.0
    metrics['volatility_60d'] = float(returns.rolling(window=60).std().iloc[-1] * np.sqrt(252)) if len(returns) >= 60 else 0.0
    
    # Support and resistance levels
    metrics['support_level'] = float(df['Low'].rolling(window=20).min().iloc[-1])
    metrics['resistance_level'] = float(df['High'].rolling(window=20).max().iloc[-1])
    
    # Moving averages
    metrics['sma_20_current'] = float(df['Close'].rolling(window=20).mean().iloc[-1]) if len(df) >= 20 else 0.0
    metrics['sma_50_current'] = float(df['Close'].rolling(window=50).mean().iloc[-1]) if len(df) >= 50 else 0.0
    metrics['sma_200_current'] = float(df['Close'].rolling(window=200).mean().iloc[-1]) if len(df) >= 200 else 0.0  # Price position relative to moving averages
    metrics['above_sma_20'] = metrics['current_price'] > metrics['sma_20_current']
    metrics['above_sma_50'] = metrics['current_price'] > metrics['sma_50_current']
    metrics['above_sma_200'] = metrics['current_price'] > metrics['sma_200_current']
    
    # Volume metrics
    metrics['avg_volume_20'] = float(df['Volume'].rolling(window=20).mean().iloc[-1]) if len(df) >= 20 else 0.0
    metrics['volume_ratio_current'] = float(df['Volume'].iloc[-1] / metrics['avg_volume_20']) if metrics['avg_volume_20'] > 0 else 0.0
    return metrics

def generate_stock_statistics(ticker_symbol, period="1y"):
    """Generate comprehensive stock statistics and chart data"""
    try:
        # Fetch stock data
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return {"error": f"No data found for ticker {ticker_symbol}, success: False"}
        
        # Get company info
        info = ticker.info
        
        # Calculate technical indicators
        indicators = calculate_technical_indicators(hist)
        
        # Calculate statistical metrics
        metrics = calculate_statistical_metrics(hist)
        
        # Prepare chart data
        chart_data = {
            "dates": hist.index.strftime('%Y-%m-%d').tolist(),
            "prices": {
                "close": hist['Close'].tolist(),
                "open": hist['Open'].tolist(),
                "high": hist['High'].tolist(),
                "low": hist['Low'].tolist()
            },
            "volume": hist['Volume'].tolist(),
            "indicators": indicators
        }
        
        # Prepare the complete response
        result = {
            "ticker": ticker_symbol,
            "company_name": info.get('longName', ticker_symbol),
            "sector": info.get('sector', 'Unknown'),
            "industry": info.get('industry', 'Unknown'),
            "market_cap": float(info.get('marketCap', 0)),
            "pe_ratio": float(info.get('trailingPE', 0)) if info.get('trailingPE') else None,
            "dividend_yield": float(info.get('dividendYield', 0)) if info.get('dividendYield') else None,
            "metrics": metrics,
            "chart_data": chart_data,
            "success": True
        }
        
        return result
        
    except Exception as e:
        return {"error": f"Error generating statistics for {ticker_symbol}: {str(e)}", "success": False}

def main():
    """Main function for command line usage"""
    import sys
    
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Ticker symbol is required",
            "success": False
        }))
        sys.exit(1)
    
    ticker = sys.argv[1].upper()
    period = sys.argv[2] if len(sys.argv) > 2 else "1y"
    
    result = generate_stock_statistics(ticker, period)
    print(json.dumps(result))

if __name__ == "__main__":
    main() 