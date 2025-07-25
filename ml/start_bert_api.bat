@echo off
echo Starting BERT Sentiment API Server...
echo.
echo This will start the BERT API on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
python bert_sentiment_api.py
pause
