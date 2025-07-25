import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings  # Updated import
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
import sys
import re
import json

# Load API key from the .env file
load_dotenv(override=True)  # override=True ensures .env file takes precedence
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    os.environ["OPENAI_API_KEY"] = openai_api_key
    print(f"Loaded API key: {openai_api_key[:10]}...", file=sys.stderr)  # Debug log
import getpass

if not os.getenv("OPENAI_API_KEY"):
    # Don't prompt for API key, just fail gracefully
    print(json.dumps({"error": "OpenAI API key not configured"}))
    sys.exit(1)

def load_and_split_documents(file_path):
    # This function handles different file types
    if file_path.endswith('.txt'):
        loader = TextLoader(file_path)
    elif file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    else:
        raise ValueError("Unsupported file type")
    
    # Load the document
    documents = loader.load()

    # Split the document into smaller chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_splitter.split_documents(documents)
    
    return docs

def ask_portfolio_question(query, retriever, llm):
    # Create the RAG chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )
    
    result = qa_chain.invoke({"query": query})
    return result

def extract_and_validate_json(text):
    """Extract and validate JSON from LLM response"""
    try:
        # Remove markdown code blocks
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        
        # Try to find JSON array first
        array_match = re.search(r'\[[\s\S]*?\]', text)
        if array_match:
            json_str = array_match.group(0)
            try:
                parsed = json.loads(json_str)
                return parsed if isinstance(parsed, list) else [parsed]
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object
        object_match = re.search(r'\{[\s\S]*?\}', text)
        if object_match:
            json_str = object_match.group(0)
            try:
                parsed = json.loads(json_str)
                return [parsed] if isinstance(parsed, dict) else parsed
            except json.JSONDecodeError:
                pass
        
        # If no valid JSON found, return empty array
        return []
        
    except Exception as e:
        print(f"Error extracting JSON: {e}", file=sys.stderr)
        return []

def main():
    # Check command line arguments
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python rag_portfolio.py <file_path>"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        # Load and split documents
        documents = load_and_split_documents(file_path)
        
        # Use OpenAI's embedding model to convert text to vectors
        embeddings = OpenAIEmbeddings()
        
        # Create a vector database from the document chunks
        db = FAISS.from_documents(documents, embeddings)
        
        # Create a retriever from our vector database
        retriever = db.as_retriever()
        
        # Initialize the LLM
        llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo")
        
        # If RAG_CHAT_PROMPT is set, use it as the question (for AI chat)
        question = os.environ.get('RAG_CHAT_PROMPT')
        if not question:
            # Default: extract portfolio as JSON
            question = """
            Extract stock portfolio information from the documents. For each stock, provide:
            - ticker: the stock symbol (string, MUST be 1-5 uppercase letters only, like AAPL, MSFT, TSLA)
            - shares: number of shares (number, must be positive)
            - purchasePrice: the price paid per share (number, use 0 if not available)
            - purchaseDate: when purchased (ISO date string, use current date if not available)
            
            IMPORTANT RULES:
            1. Only extract valid US stock symbols (1-5 uppercase letters)
            2. Ignore any symbols that contain numbers, special characters, or are longer than 5 letters
            3. Only include stocks with positive share counts
            4. Common valid symbols: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, etc.
            
            Return ONLY a valid JSON array in this exact format:
            [
              {
                "ticker": "AAPL",
                "shares": 100,
                "purchasePrice": 150.25,
                "purchaseDate": "2024-01-15T00:00:00.000Z"
              }
            ]
            
            Do not include any explanations, markdown, or additional text. Only return the JSON array.
            """
        # Get response from RAG chain
        response = ask_portfolio_question(question, retriever, llm)
        # If this is a chat prompt, just print the LLM's answer
        if os.environ.get('RAG_CHAT_PROMPT'):
            print(response['result'])
            return
        # Otherwise, extract and validate JSON from response
        portfolio_data = extract_and_validate_json(response['result'])
        # Validate the structure of each portfolio item
        validated_portfolio = []
        for item in portfolio_data:
            if isinstance(item, dict) and 'ticker' in item:
                ticker = str(item.get('ticker', '')).upper().strip()
                shares = float(item.get('shares', 0))
                
                # Validate ticker format (1-5 uppercase letters only)
                if not re.match(r'^[A-Z]{1,5}$', ticker):
                    print(f"Skipping invalid ticker format: {ticker}", file=sys.stderr)
                    continue
                
                # Validate shares (must be positive)
                if shares <= 0:
                    print(f"Skipping {ticker} with invalid shares: {shares}", file=sys.stderr)
                    continue
                
                validated_item = {
                    'ticker': ticker,
                    'shares': shares,
                    'purchasePrice': float(item.get('purchasePrice', 0)),
                    'purchaseDate': item.get('purchaseDate', '2024-01-15T00:00:00.000Z')
                }
                
                validated_portfolio.append(validated_item)
                print(f"Validated: {ticker} - {shares} shares", file=sys.stderr)
        # Output the final JSON
        print(json.dumps(validated_portfolio))
        
    except Exception as e:
        # Return error as JSON
        error_response = {"error": f"Failed to process file: {str(e)}"}
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    main()