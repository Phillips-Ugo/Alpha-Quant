import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import argparse
import sys
import warnings
warnings.filterwarnings('ignore')

def simple_trend_prediction(ticker, days_ahead=30):
    """Simple trend-based prediction without heavy ML dependencies"""
    try:
        # Fetch stock data
        stock = yf.Ticker(ticker)
        df = stock.history(period='1y')
        
        if df.empty:
            raise ValueError(f"No data available for ticker {ticker}")
        
        # Calculate basic technical indicators
        df['MA20'] = df['Close'].rolling(window=20).mean()
        df['MA50'] = df['Close'].rolling(window=50).mean()
        df['Returns'] = df['Close'].pct_change()
        df['Volatility'] = df['Returns'].rolling(window=20).std()
        
        # RSI calculation
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # Get recent values
        current_price = float(df['Close'].iloc[-1])
        ma20 = float(df['MA20'].iloc[-1]) if not pd.isna(df['MA20'].iloc[-1]) else current_price
        ma50 = float(df['MA50'].iloc[-1]) if not pd.isna(df['MA50'].iloc[-1]) else current_price
        volatility = float(df['Volatility'].iloc[-1]) if not pd.isna(df['Volatility'].iloc[-1]) else 0.02
        rsi = float(df['RSI'].iloc[-1]) if not pd.isna(df['RSI'].iloc[-1]) else 50.0
        
        # Calculate trend strength
        short_term_trend = (current_price - ma20) / ma20 if ma20 > 0 else 0
        long_term_trend = (current_price - ma50) / ma50 if ma50 > 0 else 0
        
        # Simple prediction based on momentum and mean reversion
        trend_momentum = (short_term_trend + long_term_trend) / 2
        
        # Apply RSI for overbought/oversold conditions
        rsi_factor = 1.0
        if rsi > 70:  # Overbought
            rsi_factor = 0.8
        elif rsi < 30:  # Oversold
            rsi_factor = 1.2
        
        # Calculate predicted price
        expected_return = trend_momentum * 0.5 * rsi_factor  # Conservative factor
        predicted_price = current_price * (1 + expected_return)
        
        # Add some randomness based on volatility
        confidence = max(0.6, 1.0 - (volatility * 10))  # Higher volatility = lower confidence
        
        # Calculate support and resistance levels
        recent_high = float(df['High'].tail(20).max())
        recent_low = float(df['Low'].tail(20).min())
        
        # Technical analysis signals
        signals = []
        if current_price > ma20:
            signals.append("Price above 20-day moving average (Bullish)")
        else:
            signals.append("Price below 20-day moving average (Bearish)")
            
        if rsi > 70:
            signals.append("RSI indicates overbought conditions")
        elif rsi < 30:
            signals.append("RSI indicates oversold conditions")
        else:
            signals.append("RSI in neutral range")
        
        # Create output data
        output_data = {
            'ticker': ticker.upper(),
            'success': True,
            'current_price': round(current_price, 2),
            'predicted_price': round(predicted_price, 2),
            'prediction_days': days_ahead,
            'confidence_score': round(confidence * 100, 1),
            'technical_indicators': {
                'ma20': round(ma20, 2),
                'ma50': round(ma50, 2),
                'rsi': round(rsi, 2),
                'volatility': round(volatility * 100, 2),
                'support_level': round(recent_low, 2),
                'resistance_level': round(recent_high, 2)
            },
            'analysis': {
                'trend': 'Bullish' if trend_momentum > 0.02 else 'Bearish' if trend_momentum < -0.02 else 'Neutral',
                'signals': signals,
                'risk_level': 'High' if volatility > 0.04 else 'Medium' if volatility > 0.02 else 'Low'
            },
            'model_info': {
                'type': 'Technical Analysis Based Prediction',
                'features_used': ['Moving Averages', 'RSI', 'Volatility', 'Price Momentum'],
                'note': 'Simplified prediction model - for educational purposes only'
            },
            'historical_data': {
                'dates': df.index[-30:].strftime('%Y-%m-%d').tolist(),
                'prices': df['Close'].tail(30).round(2).tolist(),
                'volumes': df['Volume'].tail(30).tolist()
            }
        }
        
        return output_data
        
    except Exception as e:
        return {
            'ticker': ticker.upper(),
            'success': False,
            'error': str(e),
            'message': 'Technical analysis prediction failed'
        }

def main():
    parser = argparse.ArgumentParser(description='Simple Stock Prediction')
    parser.add_argument('--predict', action='store_true', help='Run prediction mode')
    parser.add_argument('--days', type=int, default=30, help='Days ahead to predict')
    parser.add_argument('ticker', help='Stock ticker symbol')
    
    args = parser.parse_args()
    
    if args.predict:
        result = simple_trend_prediction(args.ticker, args.days)
        print(json.dumps(result, indent=2))
    else:
        print(json.dumps({'error': 'Please use --predict flag'}))

if __name__ == '__main__':
    main()
