from fastapi import FastAPI, Request
from transformers import pipeline
import uvicorn
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Path to your trained BERT model directory
model_path = "C:\\Users\\ugoch\\OneDrive\\Desktop\\Summer Projects\\FinancialAnalysis\\FinBertModel"

logger.info(f"Loading BERT model from: {model_path}")
try:
    sentiment_pipeline = pipeline("text-classification", model=model_path, tokenizer=model_path, device=0)
    logger.info("BERT model loaded successfully!")
except Exception as e:
    logger.error(f"Failed to load BERT model: {e}")
    # Fallback to a pre-trained model
    logger.info("Falling back to pre-trained FinBERT model...")
    sentiment_pipeline = pipeline("text-classification", model="ProsusAI/finbert", device=0)

app = FastAPI(title="Financial BERT Sentiment API", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Financial BERT Sentiment API", "status": "running", "model_path": model_path}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": sentiment_pipeline is not None}

@app.post("/sentiment")
async def get_sentiment(request: Request):
    data = await request.json()
    text = data.get("text", "")
    if not text:
        return {"error": "No text provided."}
    
    logger.info(f"Processing sentiment for text: {text[:50]}...")
    
    try:
        result = sentiment_pipeline(text)
        label = result[0]["label"].lower()
        score = result[0]["score"]
        
        # Normalize label to positive/negative/neutral
        if "positive" in label:
            sentiment = "positive"
        elif "negative" in label:
            sentiment = "negative"
        elif "neutral" in label:
            sentiment = "neutral"
        else:
            sentiment = "neutral"  # Default to neutral instead of unknown
            
        logger.info(f"Sentiment result: {sentiment} (confidence: {score:.4f})")
        
        return {
            "sentiment": sentiment, 
            "score": score,
            "raw_label": result[0]["label"],
            "model": "FinBERT"
        }
    except Exception as e:
        logger.error(f"Error processing sentiment: {e}")
        return {"error": str(e), "sentiment": "neutral", "score": 0.5}

if __name__ == "__main__":
    logger.info("Starting Financial BERT Sentiment API Server...")
    logger.info("Server will be available at: http://localhost:8000")
    logger.info("API Documentation: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
