from fastapi import FastAPI, Request
from transformers import pipeline
import uvicorn

# Path to your trained BERT model directory
model_path = "C:\\Users\\ugoch\\OneDrive\\Desktop\\Summer Projects\\FinancialAnalysis\\FinBertModel"
sentiment_pipeline = pipeline("text-classification", model=model_path, tokenizer=model_path, device=0)

app = FastAPI()

@app.post("/sentiment")
async def get_sentiment(request: Request):
    data = await request.json()
    text = data.get("text", "")
    if not text:
        return {"error": "No text provided."}
    try:
        result = sentiment_pipeline(text)
        label = result[0]["label"].lower()
        # Normalize label to positive/negative/neutral
        if "positive" in label:
            sentiment = "positive"
        elif "negative" in label:
            sentiment = "negative"
        elif "neutral" in label:
            sentiment = "neutral"
        else:
            sentiment = "unknown"
        return {"sentiment": sentiment, "score": result[0]["score"]}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
