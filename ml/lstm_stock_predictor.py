#!/usr/bin/env python3
"""
LSTM Stock Predictor Script
This script provides stock data fetching and LSTM-based price prediction functionality
for the Financial Analysis web application.
"""

import sys
import json
import argparse
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from keras.models import load_model
import os
import warnings
import math
warnings.filterwarnings('ignore')

# Import our feature engineering module
from feature_engineering import engineer_features, select_features, prepare_lstm_data

def fetch_stock_data(ticker_symbol, period="1y"):
    """Fetch stock data for display in the frontend"""
    try:
        # Create ticker object
        ticker = yf.Ticker(ticker_symbol)
        
        # Get historical data
        hist = ticker.history(period=period)
        
        if hist.empty:
            return {
                "error": f"No data found for ticker {ticker_symbol}",
                "success": False
            }
        
        # Get current stock info
        info = ticker.info
        
        # Prepare the data
        stock_data = {
            "ticker": ticker_symbol,
            "current_price": float(hist['Close'].iloc[-1]),
            "previous_close": float(hist['Close'].iloc[-2]) if len(hist) > 1 else float(hist['Close'].iloc[-1]),
            "change": float(hist['Close'].iloc[-1] - hist['Close'].iloc[-2]) if len(hist) > 1 else 0.0,
            "change_percent": float(((hist['Close'].iloc[-1] - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2] * 100) if len(hist) > 1 else 0.0),
            "volume": int(hist['Volume'].iloc[-1]),
            "high_52_week": float(hist['High'].max()),
            "low_52_week": float(hist['Low'].min()),
            "company_name": info.get('longName', ticker_symbol),
            "sector": info.get('sector', 'Unknown'),
            "industry": info.get('industry', 'Unknown'),
            "market_cap": float(info.get('marketCap', 0)),
            "pe_ratio": float(info.get('trailingPE', 0)) if info.get('trailingPE') else None,
            "dividend_yield": float(info.get('dividendYield', 0)) if info.get('dividendYield') else None,
            "historical_data": {
                "dates": hist.index.strftime('%Y-%m-%d').tolist(),
                "prices": hist['Close'].tolist(),
                "volumes": hist['Volume'].tolist(),
                "highs": hist['High'].tolist(),
                "lows": hist['Low'].tolist(),
                "opens": hist['Open'].tolist()
            },
            "success": True
        }
        
        return stock_data
        
    except Exception as e:
        return {
            "error": f"Error fetching data for {ticker_symbol}: {str(e)}",
            "success": False
        }

def make_df(ticker_symbol, period="1y"):
    """Create dataframe for LSTM model"""
    try:
        tick = yf.Ticker(ticker_symbol)
        hist = tick.history(period=period)
        df = pd.DataFrame(hist)
        return df
    except Exception as e:
        print(f"Error creating dataframe: {e}", file=sys.stderr)
        return None

def predict_stock_price(ticker_symbol, days_ahead=30):
    """Use trained LSTM model with advanced features to predict stock prices and output arrays for visualization"""
    try:
        # Fetch data for the ticker
        period = '2y'  # Use the same period as training
        df = make_df(ticker_symbol, period)
        
        if df is None or df.empty:
            return {
                "error": f"No data found for ticker {ticker_symbol}",
                "success": False
            }
        
        # Preprocess data as done during training
        df = df.drop(columns=['Dividends', 'Stock Splits'], errors='ignore')
        df = df.dropna()
        
        if len(df) < 60:  # Need at least 60 days for the model
            return {
                "error": f"Insufficient data for {ticker_symbol}. Need at least 60 days of data.",
                "success": False
            }
        
        # Engineer advanced features
        print(f"Engineering features for {ticker_symbol}...")
        feature_df = engineer_features(df)
        
        # Select the most relevant features
        print(f"Selecting features for {ticker_symbol}...")
        selected_df = select_features(feature_df, max_features=30)
        
        # Prepare data for LSTM
        print(f"Preparing LSTM data for {ticker_symbol}...")
        X_train, X_test, y_train, y_test, scaler_X, scaler_y = prepare_lstm_data(selected_df)
        
        # Load the trained model
        model_path = os.path.join(os.path.dirname(__file__), 'lstm_stock_model.h5')
        
        if not os.path.exists(model_path):
            return {
                "error": "Trained model not found. Please train the model first.",
                "success": False
            }
        
        model = load_model(model_path)
        
        # Get the last sequence for prediction
        last_sequence = X_test[-1:] if len(X_test) > 0 else X_train[-1:]
        
        # Predict future price iteratively
        prediction = None
        current_sequence = last_sequence.copy()
        predicted_prices = []
        prediction_dates = []
        for i in range(days_ahead):
            pred_scaled = model.predict(current_sequence, verbose="0")
            prediction = pred_scaled[0][0]
            # Inverse transform the prediction
            pred_price = scaler_y.inverse_transform([[prediction]])[0][0]
            predicted_prices.append(float(pred_price))
            prediction_dates.append((datetime.now() + timedelta(days=i+1)).strftime('%Y-%m-%d'))
            # Update sequence for next prediction (simplified approach)
            current_sequence = np.roll(current_sequence, -1, axis=1)
            current_sequence[0, -1, 0] = prediction  # Update the first feature (usually price)
        
        current_price = df['Close'].iloc[-1]
        # Calculate confidence based on model performance
        val_loss = model.evaluate(X_test, y_test, verbose="0") if len(X_test) > 0 else 0.01
        if isinstance(val_loss, (list, tuple)):
            val_loss = val_loss[0]  # Use only the loss, not metrics
        confidence = max(0.5, min(0.95, 1 - val_loss))  # Convert loss to confidence
        # Get feature importance (top features)
        feature_names = [col for col in selected_df.columns if col != 'Close']
        top_features = feature_names[:5]  # Top 5 features
        # For visualization: get last N days of actual prices and rolling means
        N = 60  # Show last 60 days
        vis_df = df.copy().iloc[-N:]
        vis_dates = vis_df.index.strftime('%Y-%m-%d').tolist()
        actual_prices = vis_df['Close'].tolist()
        rolling_mean_20 = clean_array(vis_df['Close'].rolling(window=20).mean().tolist())
        rolling_mean_50 = clean_array(vis_df['Close'].rolling(window=50).mean().tolist())
        rolling_mean_200 = clean_array(vis_df['Close'].rolling(window=200).mean().tolist())
        # Optionally, add RSI and volatility
        def calc_rsi(prices, period=14):
            prices = pd.Series(prices)
            delta = prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            return rsi.tolist()
        def calc_volatility(prices, period=20):
            return pd.Series(prices).rolling(window=period).std().tolist()
        rsi = clean_array(calc_rsi(vis_df['Close'], 14))
        volatility = clean_array(calc_volatility(vis_df['Close'], 20))
        return {
            "ticker": ticker_symbol,
            "current_price": float(current_price),
            "predicted_price": round(float(predicted_prices[-1]), 2) if predicted_prices else None,
            "prediction_date": prediction_dates[-1] if prediction_dates else None,
            "confidence": round(confidence, 2),
            "days_ahead": days_ahead,
            "features_used": len(feature_names),
            "top_features": top_features,
            "success": True,
            # Visualization arrays:
            "dates": vis_dates,
            "actual_prices": actual_prices,
            "predicted_prices": predicted_prices,
            "prediction_dates": prediction_dates,
            "rolling_mean_20": rolling_mean_20,
            "rolling_mean_50": rolling_mean_50,
            "rolling_mean_200": rolling_mean_200,
            "rsi": rsi,
            "volatility": volatility
        }
    except Exception as e:
        return {
            "error": f"Error predicting price for {ticker_symbol}: {str(e)}",
            "success": False
        }

def train_model(ticker_symbol, period="2y"):
    """Train a new LSTM model with advanced features for the given ticker"""
    try:
        # Fetch data
        df = make_df(ticker_symbol, period)
        if df is None or df.empty:
            return {
                "error": f"No data found for ticker {ticker_symbol}",
                "success": False
            }
        
        # Preprocess data
        df = df.drop(columns=['Dividends', 'Stock Splits'], errors='ignore')
        df = df.dropna()
        
        if len(df) < 100:  # Need sufficient data for training
            return {
                "error": f"Insufficient data for training. Need at least 100 days of data.",
                "success": False
            }
        
        # Engineer advanced features
        print(f"Engineering features for {ticker_symbol}...")
        feature_df = engineer_features(df)
        
        # Select the most relevant features
        print(f"Selecting features for {ticker_symbol}...")
        selected_df = select_features(feature_df, max_features=30)
        
        # Prepare data for LSTM
        print(f"Preparing LSTM data for {ticker_symbol}...")
        X_train, X_test, y_train, y_test, scaler_X, scaler_y = prepare_lstm_data(selected_df)
        
        # Create and train model with more sophisticated architecture
        from keras.models import Sequential
        from keras.layers import LSTM, Dense, Dropout, BatchNormalization
        
        # Get input shape from the data
        n_features = X_train.shape[2]
        
        model = Sequential([
            # First LSTM layer
            LSTM(100, return_sequences=True, input_shape=(X_train.shape[1], n_features)),
            BatchNormalization(),
            Dropout(0.3),
            
            # Second LSTM layer
            LSTM(80, return_sequences=True),
            BatchNormalization(),
            Dropout(0.3),
            
            # Third LSTM layer
            LSTM(60, return_sequences=False),
            BatchNormalization(),
            Dropout(0.3),
            
            # Dense layers
            Dense(50, activation='relu'),
            Dropout(0.2),
            Dense(25, activation='relu'),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mean_squared_error', metrics=['mae'])
        
        # Train model
        print(f"Training LSTM model for {ticker_symbol}...")
        history = model.fit(
            X_train, y_train, 
            epochs=100, 
            batch_size=32, 
            validation_data=(X_test, y_test), 
            verbose="0"
        )
        
        # Save model
        model_path = os.path.join(os.path.dirname(__file__), 'lstm_stock_model.h5')
        model.save(model_path)
        
        # Calculate accuracy
        predicted_stock_price = model.predict(X_test, verbose="0")
        predicted_stock_price = scaler_y.inverse_transform(predicted_stock_price)
        actual_prices = scaler_y.inverse_transform(y_test.reshape(-1, 1))
        accuracy = np.mean(np.abs((predicted_stock_price - actual_prices) / actual_prices)) * 100
        
        # Get feature information
        feature_names = [col for col in selected_df.columns if col != 'Close']
        
        return {
            "ticker": ticker_symbol,
            "model_accuracy": round(100 - accuracy, 2),
            "training_data_points": len(df),
            "features_used": len(feature_names),
            "top_features": feature_names[:10],  # Top 10 features
            "model_saved": True,
            "final_loss": round(float(history.history['loss'][-1]), 4),
            "final_val_loss": round(float(history.history['val_loss'][-1]), 4),
            "success": True
        }
        
    except Exception as e:
        return {
            "error": f"Error training model for {ticker_symbol}: {str(e)}",
            "success": False
        }

def clean_array(arr):
    return [float(x) if x is not None and not (isinstance(x, float) and math.isnan(x)) else None for x in arr]

def main():
    parser = argparse.ArgumentParser(description='LSTM Stock Predictor')
    parser.add_argument('ticker', help='Stock ticker symbol')
    parser.add_argument('days_ahead', nargs='?', default=30, type=int, help='Days ahead to predict (default: 30)')
    parser.add_argument('--data-only', action='store_true', help='Fetch only stock data, no prediction')
    parser.add_argument('--train', action='store_true', help='Train a new model for the ticker')
    
    args = parser.parse_args()
    
    if args.train:
        # Train a new model
        result = train_model(args.ticker)
    elif args.data_only:
        # Fetch only stock data
        result = fetch_stock_data(args.ticker)
    else:
        # Get prediction
        result = predict_stock_price(args.ticker, args.days_ahead)
    
    # Output result as JSON
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main() 