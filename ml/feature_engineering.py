#!/usr/bin/env python3
"""
Advanced Financial Feature Engineering Module
This module provides functions to create advanced financial features for LSTM models.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

def calculate_log_returns(prices: pd.Series) -> pd.Series:
    """
    Calculate log returns from price series.
    
    Args:
        prices: Series of closing prices
        
    Returns:
        Series of log returns
    """
    return np.log(prices / prices.shift(1))

def calculate_rolling_volatility(returns: pd.Series, window: int = 20) -> pd.Series:
    """
    Calculate rolling volatility (standard deviation of returns).
    
    Args:
        returns: Series of returns (log returns recommended)
        window: Rolling window size (default: 20 days)
        
    Returns:
        Series of rolling volatility
    """
    return returns.rolling(window=window).std()

def calculate_rsi(prices: pd.Series, window: int = 14) -> pd.Series:
    """
    Calculate Relative Strength Index (RSI).
    
    Args:
        prices: Series of closing prices
        window: RSI calculation window (default: 14 days)
        
    Returns:
        Series of RSI values (0-100)
    """
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_moving_averages(prices: pd.Series, windows: List[int] = [5, 10, 20, 50]) -> Dict[str, pd.Series]:
    """
    Calculate multiple moving averages.
    
    Args:
        prices: Series of closing prices
        windows: List of window sizes for moving averages
        
    Returns:
        Dictionary of moving average series
    """
    ma_dict = {}
    for window in windows:
        ma_dict[f'ma_{window}'] = prices.rolling(window=window).mean()
    return ma_dict

def calculate_price_momentum(prices: pd.Series, periods: List[int] = [1, 3, 5, 10]) -> Dict[str, pd.Series]:
    """
    Calculate price momentum (percentage change over different periods).
    
    Args:
        prices: Series of closing prices
        periods: List of periods for momentum calculation
        
    Returns:
        Dictionary of momentum series
    """
    momentum_dict = {}
    for period in periods:
        momentum_dict[f'momentum_{period}'] = prices.pct_change(periods=period)
    return momentum_dict

def calculate_volume_features(volume: pd.Series, prices: pd.Series, windows: List[int] = [5, 10, 20]) -> Dict[str, pd.Series]:
    """
    Calculate volume-based features.
    
    Args:
        volume: Series of trading volumes
        prices: Series of closing prices
        windows: List of window sizes for volume calculations
        
    Returns:
        Dictionary of volume features
    """
    volume_features = {}
    
    # Volume moving averages
    for window in windows:
        volume_features[f'volume_ma_{window}'] = volume.rolling(window=window).mean()
    
    # Volume-price trend
    volume_features['volume_price_trend'] = (volume * prices).rolling(window=20).mean()
    
    # Volume ratio (current volume / average volume)
    volume_features['volume_ratio'] = volume / volume.rolling(window=20).mean()
    
    return volume_features

def calculate_technical_indicators(prices: pd.Series, volumes: pd.Series) -> Dict[str, pd.Series]:
    """
    Calculate various technical indicators.
    
    Args:
        prices: Series of closing prices
        volumes: Series of trading volumes
        
    Returns:
        Dictionary of technical indicators
    """
    indicators = {}
    
    # Bollinger Bands
    ma_20 = prices.rolling(window=20).mean()
    std_20 = prices.rolling(window=20).std()
    indicators['bb_upper'] = ma_20 + (std_20 * 2)
    indicators['bb_lower'] = ma_20 - (std_20 * 2)
    indicators['bb_width'] = (indicators['bb_upper'] - indicators['bb_lower']) / ma_20
    indicators['bb_position'] = (prices - indicators['bb_lower']) / (indicators['bb_upper'] - indicators['bb_lower'])
    
    # MACD
    ema_12 = prices.ewm(span=12).mean()
    ema_26 = prices.ewm(span=26).mean()
    indicators['macd'] = ema_12 - ema_26
    indicators['macd_signal'] = indicators['macd'].ewm(span=9).mean()
    indicators['macd_histogram'] = indicators['macd'] - indicators['macd_signal']
    
    # Stochastic Oscillator
    low_14 = prices.rolling(window=14).min()
    high_14 = prices.rolling(window=14).max()
    indicators['stoch_k'] = 100 * (prices - low_14) / (high_14 - low_14)
    indicators['stoch_d'] = indicators['stoch_k'].rolling(window=3).mean()
    
    return indicators

def create_lag_features(data: pd.Series, lags: List[int] = [1, 2, 3, 5, 10]) -> Dict[str, pd.Series]:
    """
    Create lagged features for time series analysis.
    
    Args:
        data: Series to create lags for
        lags: List of lag periods
        
    Returns:
        Dictionary of lagged features
    """
    lag_features = {}
    for lag in lags:
        lag_features[f'lag_{lag}'] = data.shift(lag)
    return lag_features

def calculate_returns_features(prices: pd.Series) -> Dict[str, pd.Series]:
    """
    Calculate various return-based features.
    
    Args:
        prices: Series of closing prices
        
    Returns:
        Dictionary of return features
    """
    returns_features = {}
    
    # Log returns
    returns_features['log_returns'] = calculate_log_returns(prices)
    
    # Simple returns
    returns_features['simple_returns'] = prices.pct_change()
    
    # Rolling volatility
    returns_features['volatility_20'] = calculate_rolling_volatility(returns_features['log_returns'], 20)
    returns_features['volatility_60'] = calculate_rolling_volatility(returns_features['log_returns'], 60)
    
    # Cumulative returns
    returns_features['cumulative_returns'] = (1 + returns_features['simple_returns']).cumprod()
    
    # Rolling Sharpe ratio (assuming risk-free rate of 0)
    returns_features['sharpe_ratio'] = (returns_features['log_returns'].rolling(20).mean() / 
                                       returns_features['log_returns'].rolling(20).std()) * np.sqrt(252)
    
    return returns_features

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Main function to engineer all features for the LSTM model.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        DataFrame with engineered features
    """
    # Ensure we have the required columns
    required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Create a copy to avoid modifying original data
    feature_df = df.copy()
    
    # Extract price and volume data
    prices = feature_df['Close']
    volumes = feature_df['Volume']
    
    # Calculate all feature categories
    print("Engineering features...")
    
    # 1. Return features
    print("  Calculating return features...")
    returns_features = calculate_returns_features(prices)
    for name, feature in returns_features.items():
        feature_df[f'return_{name}'] = feature
    
    # 2. Moving averages
    print("  Calculating moving averages...")
    ma_features = calculate_moving_averages(prices)
    for name, feature in ma_features.items():
        feature_df[name] = feature  # Remove redundant 'ma_' prefix since it's already in the name
    
    # 3. Price momentum
    print("  Calculating price momentum...")
    momentum_features = calculate_price_momentum(prices)
    for name, feature in momentum_features.items():
        feature_df[name] = feature  # Remove redundant 'momentum_' prefix since it's already in the name
    
    # 4. Volume features
    print("  Calculating volume features...")
    volume_features = calculate_volume_features(volumes, prices)
    for name, feature in volume_features.items():
        feature_df[name] = feature  # Remove redundant 'volume_' prefix since it's already in the name
    
    # 5. Technical indicators
    print("  Calculating technical indicators...")
    tech_indicators = calculate_technical_indicators(prices, volumes)
    for name, feature in tech_indicators.items():
        feature_df[f'tech_{name}'] = feature
    
    # 6. RSI
    print("  Calculating RSI...")
    feature_df['rsi'] = calculate_rsi(prices)
    
    # 7. Lag features for key variables
    print("  Creating lag features...")
    key_variables = ['Close', 'Volume', 'return_log_returns', 'rsi']
    for var in key_variables:
        if var in feature_df.columns:
            lag_features = create_lag_features(feature_df[var])
            for name, feature in lag_features.items():
                feature_df[f'{var}_{name}'] = feature
    
    # 8. Price ratios and spreads
    print("  Calculating price ratios...")
    feature_df['high_low_ratio'] = feature_df['High'] / feature_df['Low']
    feature_df['open_close_ratio'] = feature_df['Open'] / feature_df['Close']
    feature_df['price_range'] = feature_df['High'] - feature_df['Low']
    feature_df['price_range_pct'] = feature_df['price_range'] / feature_df['Close']
    
    # 9. Volume-price relationships
    print("  Calculating volume-price relationships...")
    feature_df['volume_price_ratio'] = feature_df['Volume'] / feature_df['Close']
    feature_df['dollar_volume'] = feature_df['Volume'] * feature_df['Close']
    
    # Remove any infinite or NaN values
    feature_df = feature_df.replace([np.inf, -np.inf], np.nan)
    
    print(f"Feature engineering complete! Created {len(feature_df.columns)} features")
    
    return feature_df

def select_features(df: pd.DataFrame, target_column: str = 'Close', 
                   max_features: int = 50, correlation_threshold: float = 0.95) -> pd.DataFrame:
    """
    Select the most relevant features for the model.
    
    Args:
        df: DataFrame with all engineered features
        target_column: Target variable column
        max_features: Maximum number of features to select
        correlation_threshold: Threshold for removing highly correlated features
        
    Returns:
        DataFrame with selected features
    """
    print(f"Selecting features for target: {target_column}")
    
    # Remove rows with NaN values
    df_clean = df.dropna()
    
    if len(df_clean) == 0:
        raise ValueError("No data remaining after removing NaN values")
    
    # Calculate correlations with target
    correlations = df_clean.corr()[target_column].abs().sort_values(ascending=False)
    
    # Select top features
    top_features = correlations.head(max_features + 1).index.tolist()  # +1 for target column
    if target_column in top_features:
        top_features.remove(target_column)
    
    # Remove highly correlated features
    selected_features = []
    for feature in top_features:
        if feature in df_clean.columns:
            # Check correlation with already selected features
            if len(selected_features) > 0:
                correlations_with_selected = df_clean[selected_features + [feature]].corr()[feature].abs()
                max_corr = correlations_with_selected[selected_features].max()
                if max_corr < correlation_threshold:
                    selected_features.append(feature)
            else:
                selected_features.append(feature)
    
    # Create final feature set
    final_features = [target_column] + selected_features
    selected_df = df_clean[final_features]
    
    print(f"Selected {len(selected_features)} features out of {len(df.columns)} total features")
    print(f"Top 10 features by correlation with {target_column}:")
    for i, feature in enumerate(selected_features[:10]):
        corr = correlations[feature]
        print(f"  {i+1}. {feature}: {corr:.4f}")
    
    return selected_df

def prepare_lstm_data(df: pd.DataFrame, target_column: str = 'Close', 
                     sequence_length: int = 60, test_size: float = 0.2) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, object, object]:
    """
    Prepare data for LSTM model with engineered features.
    
    Args:
        df: DataFrame with engineered features
        target_column: Target variable column
        sequence_length: Length of input sequences
        test_size: Proportion of data for testing
        
    Returns:
        Tuple of (X_train, X_test, y_train, y_test) arrays
    """
    print(f"Preparing LSTM data with sequence length: {sequence_length}")
    
    # Remove any remaining NaN values
    df_clean = df.dropna()
    
    if len(df_clean) < sequence_length + 10:
        raise ValueError(f"Insufficient data. Need at least {sequence_length + 10} rows, got {len(df_clean)}")
    
    # Separate features and target
    feature_columns = [col for col in df_clean.columns if col != target_column]
    X = df_clean[feature_columns].values
    y = df_clean[target_column].values
    
    # Normalize features
    from sklearn.preprocessing import MinMaxScaler
    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()
    
    X_scaled = scaler_X.fit_transform(X)
    y_scaled = scaler_y.fit_transform(y.reshape(-1, 1)).flatten()
    
    # Create sequences
    X_sequences, y_sequences = [], []
    for i in range(len(X_scaled) - sequence_length):
        X_sequences.append(X_scaled[i:(i + sequence_length)])
        y_sequences.append(y_scaled[i + sequence_length])
    
    X_sequences = np.array(X_sequences)
    y_sequences = np.array(y_sequences)
    
    # Split into train and test
    split_idx = int(len(X_sequences) * (1 - test_size))
    X_train = X_sequences[:split_idx]
    X_test = X_sequences[split_idx:]
    y_train = y_sequences[:split_idx]
    y_test = y_sequences[split_idx:]
    
    print(f"Data prepared:")
    print(f"  Training samples: {len(X_train)}")
    print(f"  Testing samples: {len(X_test)}")
    print(f"  Features per sample: {X_train.shape[2]}")
    print(f"  Sequence length: {X_train.shape[1]}")
    
    return X_train, X_test, y_train, y_test, scaler_X, scaler_y

def get_feature_importance(model, feature_names: List[str]) -> Dict[str, float]:
    """
    Get feature importance from trained model (if applicable).
    
    Args:
        model: Trained model
        feature_names: List of feature names
        
    Returns:
        Dictionary of feature importance scores
    """
    # This is a placeholder - LSTM models don't have direct feature importance
    # You could implement permutation importance or other methods
    return {name: 0.0 for name in feature_names}

if __name__ == "__main__":
    # Test the feature engineering
    import yfinance as yf
    
    # Download sample data
    ticker = yf.Ticker("AAPL")
    df = ticker.history(period="1y")
    
    print("🧪 Testing feature engineering...")
    
    # Engineer features and prepare data in one go
    feature_df = engineer_features(df)
    selected_df = select_features(feature_df)
    X_train, X_test, y_train, y_test, scaler_X, scaler_y = prepare_lstm_data(selected_df)
    
    print("✅ Feature engineering test completed successfully!") 