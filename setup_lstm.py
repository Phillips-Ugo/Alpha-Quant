#!/usr/bin/env python3
"""
LSTM Model Setup Script
This script helps set up the LSTM model for the Financial Analysis web application.
"""

import os
import sys
import subprocess
import platform

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("Python 3.8 or higher is required")
        return False
    print(f"Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def install_dependencies():
    """Install required Python packages"""
    print("\nInstalling Python dependencies...")
    
    requirements_path = os.path.join('ml', 'requirements.txt')
    if not os.path.exists(requirements_path):
        print("requirements.txt not found in ml/ directory")
        return False
    
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', requirements_path])
        print("Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install dependencies: {e}")
        return False

def train_initial_model():
    """Train the initial LSTM model"""
    print("\nTraining initial LSTM model...")
    
    training_script = os.path.join('ml', 'train_initial_model.py')
    if not os.path.exists(training_script):
        print("Training script not found")
        return False
    
    try:
        subprocess.check_call([sys.executable, training_script])
        print("Initial model training completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to train model: {e}")
        return False

def test_prediction():
    """Test the prediction functionality"""
    print("\nTesting prediction functionality...")
    
    predictor_script = os.path.join('ml', 'lstm_stock_predictor.py')
    if not os.path.exists(predictor_script):
        print("Predictor script not found")
        return False
    
    try:
        # Test with AAPL
        result = subprocess.run(
            [sys.executable, predictor_script, 'AAPL', '--data-only'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("Prediction test successful")
            return True
        else:
            print(f"Prediction test failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"Failed to test prediction: {e}")
        return False

def main():
    """Main setup function"""
    print("LSTM Model Setup for Financial Analysis Web App")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("\nTry running: pip install -r ml/requirements.txt manually")
        sys.exit(1)
    
    # Train initial model
    if not train_initial_model():
        print("\nTry running: python ml/train_initial_model.py manually")
        sys.exit(1)
    
    # Test prediction
    if not test_prediction():
        print("\nCheck the logs above for errors")
        sys.exit(1)
    
    print("\nSetup completed successfully!")
    print("\nNext steps:")
    print("1. Start the Node.js server: npm start")
    print("2. Start the React client: cd client && npm start")
    print("3. Navigate to the Stock Analysis page")
    print("4. Enter a stock symbol and click 'Analyze'")
    print("\nTo train a new model for a specific stock:")
    print("   - Use the 'Train Model' button in the web interface")
    print("   - Or run: python ml/lstm_stock_predictor.py SYMBOL --train")

if __name__ == "__main__":
    main() 