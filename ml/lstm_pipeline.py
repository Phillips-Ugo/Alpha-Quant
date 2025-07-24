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
    df = yf.Ticker(ticker).history(period=period)
    if df.empty:
        raise ValueError(f"No data for ticker {ticker}")
    df = df.drop(columns=['Dividends', 'Stock Splits'], errors='ignore')
    df = df.dropna()
    return df

def engineer_features(df):
    df['MA20'] = df['Close'].rolling(window=20).mean()
    df['MA50'] = df['Close'].rolling(window=50).mean()
    df['MA200'] = df['Close'].rolling(window=200).mean()
    df['Return'] = df['Close'].pct_change()
    df['Volatility'] = df['Close'].rolling(window=20).std()
    # RSI
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    df = df.dropna()
    return df

def prepare_lstm_data(df, seq_len=30):
    features = [col for col in df.columns if col != 'Close']
    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()
    X = scaler_X.fit_transform(df[features])
    y = scaler_y.fit_transform(df[['Close']])
    X_seq, y_seq = [], []
    for i in range(seq_len, len(df)):
        X_seq.append(X[i-seq_len:i])
        y_seq.append(y[i])
    X_seq, y_seq = np.array(X_seq), np.array(y_seq)
    split = int(0.8 * len(X_seq))
    return X_seq[:split], X_seq[split:], y_seq[:split], y_seq[split:], scaler_X, scaler_y, features

def train_lstm(X_train, y_train, X_test, y_test, n_features):
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
    history = model.fit(X_train, y_train, epochs=60, batch_size=32, validation_data=(X_test, y_test), verbose=1)
    return model, history

def predict_future(model, last_sequence, scaler_y, days_ahead=30):
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

def main():
    parser = argparse.ArgumentParser(description='LSTM Stock Pipeline')
    parser.add_argument('ticker', help='Stock ticker symbol')
    parser.add_argument('--train', action='store_true', help='Train and save model')
    parser.add_argument('--predict', action='store_true', help='Predict future prices')
    parser.add_argument('--days', type=int, default=30, help='Days ahead to predict')
    args = parser.parse_args()

    try:
        df = fetch_data(args.ticker)
        print(f"Fetched data for {args.ticker}: shape={df.shape}")
        print(df.head())
        if df.shape[0] < 250:
            raise ValueError(f"Not enough data for {args.ticker}. Need at least 250 rows, got {df.shape[0]}")
        df_feat = engineer_features(df)
        print(f"Engineered features for {args.ticker}: shape={df_feat.shape}")
        print(df_feat.head())
        if df_feat.shape[0] < 50:
            raise ValueError(f"Not enough feature data for {args.ticker}. Need at least 50 rows, got {df_feat.shape[0]}")
        X_train, X_test, y_train, y_test, scaler_X, scaler_y, features = prepare_lstm_data(df_feat)
        print(f"X_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
        print(f"X_test shape: {X_test.shape}, y_test shape: {y_test.shape}")
        if X_train.shape[0] == 0 or X_test.shape[0] == 0:
            raise ValueError("Insufficient data for LSTM training. Check sequence length and data size.")
        n_features = X_train.shape[2]
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    # Train model and predict in-memory, no save/load
    try:
        model, history = train_lstm(X_train, y_train, X_test, y_test, n_features)
        print(f"Model trained for {args.ticker}")

        # Save engineered features for visualization
        vis_features = {}
        for feat in features:
            vis_features[feat] = df_feat[feat].tolist()[-100:]  # last 100 points
        with open(f'{args.ticker}_engineered_features.json', 'w') as f:
            json.dump(vis_features, f)
        print(f"Engineered features saved for {args.ticker}")

        # Save actual prices for visualization
        actual_prices = df_feat['Close'].tolist()[-100:]
        dates = df_feat.index.strftime('%Y-%m-%d').tolist()[-100:]
        with open(f'{args.ticker}_actual_prices.json', 'w') as f:
            json.dump({'dates': dates, 'actual_prices': actual_prices}, f)
        print(f"Actual prices saved for {args.ticker}")

        # Predict future prices if requested
        if args.predict:
            if X_test.shape[0] == 0:
                print(json.dumps({"error": "Insufficient test data for prediction."}))
                sys.exit(1)
            last_seq = X_test[-1:]
            predicted = predict_future(model, last_seq, scaler_y, args.days)
            # Get last 100 actual prices for comparison
            actual_prices = df_feat['Close'].tolist()[-100:]
            dates_actual = df_feat.index.strftime('%Y-%m-%d').tolist()[-100:]
            dates_pred = [(datetime.now() + timedelta(days=i+1)).strftime('%Y-%m-%d') for i in range(args.days)]
            # Output all for frontend plotting
            print(json.dumps({
                'ticker': args.ticker,
                'engineered_features': {feat: df_feat[feat].tolist()[-100:] for feat in features},
                'actual_prices': actual_prices,
                'actual_dates': dates_actual,
                'predicted_prices': predicted,
                'prediction_dates': dates_pred
            }, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
