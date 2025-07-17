#!/usr/bin/env python3
"""
Advanced LSTM Model Training Script with Feature Engineering
This script trains the initial LSTM model with advanced features for the web application.
Run this script once to create the base model with engineered features.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout, BatchNormalization
import os
import warnings
warnings.filterwarnings('ignore')

# Import our feature engineering module
from feature_engineering import engineer_features, select_features, prepare_lstm_data

def make_df(ticker_symbol, period="2y"):
    """Create dataframe for LSTM model"""
    try:
        tick = yf.Ticker(ticker_symbol)
        hist = tick.history(period=period)
        df = pd.DataFrame(hist)
        return df
    except Exception as e:
        print(f"Error creating dataframe: {e}")
        return None

def train_initial_model(ticker_symbol="AAPL", period="2y"):
    """Train the initial LSTM model with advanced features"""
    print(f"Training Advanced LSTM model for {ticker_symbol}...")
    
    # Fetch data
    df = make_df(ticker_symbol, period)
    if df is None or df.empty:
        print(f"No data found for ticker {ticker_symbol}")
        return False
    
    print(f"Fetched {len(df)} days of data")
    
    # Preprocess data
    df = df.drop(columns=['Dividends', 'Stock Splits'], errors='ignore')
    df = df.dropna()
    
    if len(df) < 100:
        print(f"Insufficient data for training. Need at least 100 days, got {len(df)}")
        return False
    
    # Engineer advanced features and select optimal ones
    print("Engineering and selecting optimal features...")
    feature_df = engineer_features(df)
    selected_df = select_features(feature_df, max_features=30)
    
    # Prepare data for LSTM
    print("Preparing LSTM data...")
    X_train, X_test, y_train, y_test, scaler_X, scaler_y = prepare_lstm_data(selected_df)
    
    print(f"Training on {len(X_train)} sequences, testing on {len(X_test)} sequences")
    print(f"Using {X_train.shape[2]} features per sequence")
    
    # Create and train model with sophisticated architecture
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
    
    print("Training model with advanced features...")
    # Train model
    history = model.fit(
        X_train, y_train, 
        epochs=100, 
        batch_size=32, 
        validation_data=(X_test, y_test), 
        verbose="1"
    )
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), 'lstm_stock_model.h5')
    model.save(model_path)
    print(f"Model saved to {model_path}")
    
    # Calculate accuracy and get feature information
    predicted_stock_price = model.predict(X_test, verbose="0")
    predicted_stock_price = scaler_y.inverse_transform(predicted_stock_price)
    actual_prices = scaler_y.inverse_transform(y_test.reshape(-1, 1))
    accuracy = np.mean(np.abs((predicted_stock_price - actual_prices) / actual_prices)) * 100
    feature_names = [col for col in selected_df.columns if col != 'Close']
    
    print(f"Model Performance:")
    print(f"  Accuracy: {100 - accuracy:.2f}%")
    print(f"  Final Loss: {history.history['loss'][-1]:.4f}")
    print(f"  Final Val Loss: {history.history['val_loss'][-1]:.4f}")
    print(f"  Features Used: {len(feature_names)}")
    print(f"  Top 5 Features: {feature_names[:5]}")
    
    return True

if __name__ == "__main__":
    # Train model with AAPL as default (you can change this)
    success = train_initial_model("AAPL", "2y")
    if success:
        print("\nThe model is now ready to be used by the web application.")
        print("This model includes advanced features like:")
        print("   - Log returns and rolling volatility")
        print("   - RSI and technical indicators")
        print("   - Lag features and momentum")
        print("   - Volume-price relationships")
    else:
        print("\nModel training failed!") 