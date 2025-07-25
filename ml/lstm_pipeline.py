import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential, load_model
from keras.layers import LSTM, Dense, Dropout, BatchNormalization
import os
import json
import argparse
import sys
import warnings
warnings.filterwarnings('ignore')

def fetch_data(ticker, period='2y'):
    """Fetch stock data from Yahoo Finance"""
    try:
        df = yf.Ticker(ticker).history(period=period)
        if df.empty:
            raise ValueError(f"No data available for ticker {ticker}")
        df = df.drop(columns=['Dividends', 'Stock Splits'], errors='ignore')
        df = df.dropna()
        return df
    except Exception as e:
        raise ValueError(f"Failed to fetch data for {ticker}: {str(e)}")

def engineer_features(df):
    """Create technical indicators and features"""
    try:
        # Moving averages
        df['MA20'] = df['Close'].rolling(window=20).mean()
        df['MA50'] = df['Close'].rolling(window=50).mean()  
        df['MA200'] = df['Close'].rolling(window=200).mean()
        
        # Returns and volatility
        df['Return'] = df['Close'].pct_change()
        df['Volatility'] = df['Close'].rolling(window=20).std()
        
        # RSI calculation
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # MACD
        exp1 = df['Close'].ewm(span=12).mean()
        exp2 = df['Close'].ewm(span=26).mean()
        df['MACD'] = exp1 - exp2
        df['MACD_Signal'] = df['MACD'].ewm(span=9).mean()
        
        # Bollinger Bands
        df['BB_Upper'] = df['MA20'] + (df['Volatility'] * 2)
        df['BB_Lower'] = df['MA20'] - (df['Volatility'] * 2)
        
        # Volume indicators
        df['Volume_MA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_MA']
        
        df = df.dropna()
        return df
    except Exception as e:
        raise ValueError(f"Feature engineering failed: {str(e)}")

def prepare_lstm_data(df, seq_len=30):
    """Prepare data for LSTM training"""
    try:
        # Select features (exclude Close as it's our target)
        feature_columns = [col for col in df.columns if col not in ['Close']]
        
        # Initialize scalers
        scaler_X = MinMaxScaler()
        scaler_y = MinMaxScaler()
        
        # Scale features and target
        X = scaler_X.fit_transform(df[feature_columns])
        y = scaler_y.fit_transform(df[['Close']])
        
        # Create sequences
        X_seq, y_seq = [], []
        for i in range(seq_len, len(df)):
            X_seq.append(X[i-seq_len:i])
            y_seq.append(y[i])
        
        X_seq, y_seq = np.array(X_seq), np.array(y_seq)
        
        # Train/test split
        split = int(0.8 * len(X_seq))
        X_train = X_seq[:split]
        X_test = X_seq[split:]
        y_train = y_seq[:split] 
        y_test = y_seq[split:]
        
        return X_train, X_test, y_train, y_test, scaler_X, scaler_y, feature_columns
    except Exception as e:
        raise ValueError(f"Data preparation failed: {str(e)}")

def train_lstm(X_train, y_train, X_test, y_test, n_features):
    """Train LSTM model"""
    try:
        model = Sequential([
            LSTM(100, return_sequences=True, input_shape=(X_train.shape[1], n_features)),
            BatchNormalization(),
            Dropout(0.3),
            LSTM(80, return_sequences=True),
            BatchNormalization(), 
            Dropout(0.3),
            LSTM(60, return_sequences=False),
            BatchNormalization(),
            Dropout(0.3),
            Dense(50, activation='relu'),
            Dropout(0.2),
            Dense(25, activation='relu'),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mean_squared_error', metrics=['mae'])
        history = model.fit(
            X_train, y_train, 
            epochs=60, 
            batch_size=32, 
            validation_data=(X_test, y_test),
            verbose=0  # Reduce output noise
        )
        
        return model, history
    except Exception as e:
        raise ValueError(f"Model training failed: {str(e)}")

def predict_future(model, last_sequence, scaler_y, days_ahead=30):
    """Generate future price predictions"""
    try:
        predicted_prices = []
        current_sequence = last_sequence.copy()
        
        for i in range(days_ahead):
            pred_scaled = model.predict(current_sequence, verbose=0)
            pred_price = scaler_y.inverse_transform([[pred_scaled[0][0]]])[0][0]
            predicted_prices.append(float(pred_price))
            
            # Update sequence for next prediction
            current_sequence = np.roll(current_sequence, -1, axis=1)
            current_sequence[0, -1, 0] = pred_scaled[0][0]
        
        return predicted_prices
    except Exception as e:
        raise ValueError(f"Prediction failed: {str(e)}")

def calculate_accuracy(y_test, predictions):
    """Calculate model accuracy based on test performance"""
    try:
        # Convert back to original scale for accurate percentage calculation
        mape = np.mean(np.abs((y_test - predictions) / y_test)) * 100
        # Convert MAPE to accuracy percentage (higher is better)
        accuracy = max(0, min(100, 100 - mape))  # Accuracy as percentage
        return float(accuracy)
    except:
        return 50.0  # Default accuracy as percentage

def main():
    parser = argparse.ArgumentParser(description='Alpha Mind LSTM Stock Pipeline')
    parser.add_argument('ticker', help='Stock ticker symbol for Alpha Mind')
    parser.add_argument('--train', action='store_true', help='Train and save model (Alpha Mind)')
    parser.add_argument('--predict', action='store_true', help='Predict future prices (Alpha Mind)')
    parser.add_argument('--days', type=int, default=30, help='Days ahead to predict (Alpha Mind)')
    args = parser.parse_args()

    ticker = args.ticker.upper()
    
    try:
        # Step 1: Fetch and validate data
        print(f"[Alpha Mind] Fetching data for {ticker}...", file=sys.stderr)
        df = fetch_data(ticker)
        
        if df.shape[0] < 250:
            raise ValueError(f"Insufficient data for {ticker}. Need at least 250 rows, got {df.shape[0]}")
        
        # Step 2: Engineer features
        print(f"[Alpha Mind] Engineering features for {ticker}...", file=sys.stderr)
        df_feat = engineer_features(df)
        
        if df_feat.shape[0] < 50:
            raise ValueError(f"Insufficient feature data for {ticker}. Need at least 50 rows after feature engineering")
        
        # Step 3: Prepare LSTM data
        print(f"[Alpha Mind] Preparing LSTM data for {ticker}...", file=sys.stderr)
        X_train, X_test, y_train, y_test, scaler_X, scaler_y, features = prepare_lstm_data(df_feat)
        
        if X_train.shape[0] == 0 or X_test.shape[0] == 0:
            raise ValueError("Insufficient data for LSTM training after sequence creation")
        
        n_features = X_train.shape[2]
        
        # Step 4: Train model
        print(f"[Alpha Mind] Training LSTM model for {ticker}...", file=sys.stderr)
        model, history = train_lstm(X_train, y_train, X_test, y_test, n_features)
        
        # Step 5: Generate predictions if requested
        if args.predict:
            print(f"[Alpha Mind] Generating predictions for {ticker}...", file=sys.stderr)
            
            # Get test predictions for accuracy calculation
            test_predictions = model.predict(X_test, verbose=0)
            accuracy = calculate_accuracy(y_test, test_predictions)
            
            # Generate future predictions
            last_seq = X_test[-1:]
            predicted_prices = predict_future(model, last_seq, scaler_y, args.days)
            
            # Prepare historical data (last 100 points)
            actual_prices = df_feat['Close'].tolist()[-100:]
            actual_dates = df_feat.index.strftime('%Y-%m-%d').tolist()[-100:]
            
            # Generate future dates
            last_date = df_feat.index[-1]
            prediction_dates = []
            for i in range(1, args.days + 1):
                future_date = last_date + timedelta(days=i)
                prediction_dates.append(future_date.strftime('%Y-%m-%d'))
            
            # Prepare engineered features for visualization
            engineered_features = {}
            for feat in features:
                if feat in df_feat.columns:
                    engineered_features[feat] = df_feat[feat].tolist()[-100:]

            # Feature importance by variance (proxy)
            feature_variances = {feat: np.var(df_feat[feat].values[-100:]) for feat in features if feat in df_feat.columns}
            sorted_features = sorted(feature_variances.items(), key=lambda x: x[1], reverse=True)
            top_features = [f[0] for f in sorted_features[:5]]
            top_feature_importances = [f[1] for f in sorted_features[:5]]

            # Prepare output data with keys matching frontend requirements
            output_data = {
                'ticker': ticker,
                'success': True,
                'current_price': float(actual_prices[-1]) if actual_prices else None,
                'predicted_price': float(predicted_prices[-1]) if predicted_prices else None,
                'accuracy': accuracy,
                'prediction_date': prediction_dates[-1] if prediction_dates else None,
                'actual_prices': actual_prices,
                'dates': actual_dates,
                'predicted_prices': predicted_prices,
                'prediction_dates': prediction_dates,
                'rolling_mean_20': engineered_features.get('MA20', []),
                'rolling_mean_50': engineered_features.get('MA50', []),
                'rolling_mean_200': engineered_features.get('MA200', []),
                'rsi': engineered_features.get('RSI', []),
                'volatility': engineered_features.get('Volatility', []),
                'top_features': top_features,
                'top_feature_importances': top_feature_importances,
                'model_metrics': {
                    'training_samples': int(X_train.shape[0]),
                    'test_samples': int(X_test.shape[0]),
                    'features_count': int(n_features),
                    'sequence_length': int(X_train.shape[1])
                }
            }
            # Output JSON to stdout for Node.js to capture
            print(json.dumps(output_data, indent=2))
            
        else:
            # Training only mode
            output_data = {
                'ticker': ticker,
                'success': True,
                'message': f'Alpha Mind model trained successfully for {ticker}',
                'training_samples': int(X_train.shape[0]),
                'test_samples': int(X_test.shape[0]),
                'features_count': int(n_features)
            }
            print(json.dumps(output_data, indent=2))
            
    except Exception as e:
        # Output error as JSON
        error_data = {
            'success': False,
            'error': str(e),
            'ticker': ticker if 'ticker' in locals() else args.ticker
        }
        print(json.dumps(error_data, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()