#!/usr/bin/env python3
"""
Test script to verify stock data fetching functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from lstm_stock_predictor import fetch_stock_data, predict_stock_price

def test_stock_data():
    """Test fetching stock data for a known stock"""
    print("Testing stock data fetching...")
    
    # Test with Apple stock
    result = fetch_stock_data("AAPL")
    
    if result["success"]:
        print("✅ Stock data fetched successfully!")
        print(f"Company: {result['company_name']}")
        print(f"Current Price: ${result['current_price']}")
        print(f"Change: ${result['change']} ({result['change_percent']}%)")
        print(f"Volume: {result['volume']:,}")
        print(f"Sector: {result['sector']}")
        print(f"Industry: {result['industry']}")
    else:
        print(f"❌ Failed to fetch stock data: {result['error']}")
        return False
    
    return True

def test_prediction():
    """Test prediction functionality"""
    print("\nTesting prediction functionality...")
    
    result = predict_stock_price("AAPL", 30)
    
    if result["success"]:
        print("✅ Prediction generated successfully!")
        print(f"Current Price: ${result['current_price']}")
        print(f"Predicted Price: ${result['predicted_price']}")
        print(f"Prediction Date: {result['prediction_date']}")
        print(f"Confidence: {result['confidence']:.1%}")
    else:
        print(f"❌ Failed to generate prediction: {result['error']}")
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 Testing Stock Analysis System\n")
    
    # Test stock data fetching
    data_success = test_stock_data()
    
    # Test prediction
    pred_success = test_prediction()
    
    if data_success and pred_success:
        print("\n🎉 All tests passed! The system is ready to use.")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        sys.exit(1) 