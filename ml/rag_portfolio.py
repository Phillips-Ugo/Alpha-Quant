import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
import sys
import re
import json

# Load API key from the .env file
load_dotenv()
os.environ["OPENAI_API_KEY"] = process.env.OPENAI_API_KEY
import getpass

if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")

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
            - ticker: the stock symbol (string)
            - shares: number of shares (number)
            - purchasePrice: the price paid per share (number, use 0 if not available)
            - purchaseDate: when purchased (ISO date string, use current date if not available)
            
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
                validated_item = {
                    'ticker': str(item.get('ticker', '')).upper(),
                    'shares': float(item.get('shares', 0)),
                    'purchasePrice': float(item.get('purchasePrice', 0)),
                    'purchaseDate': item.get('purchaseDate', '2024-01-01T00:00:00.000Z')
                }
                # Only add if ticker is not empty and shares > 0
                if validated_item['ticker'] and validated_item['shares'] > 0:
                    validated_portfolio.append(validated_item)
        # Output the final JSON
        print(json.dumps(validated_portfolio))
        
    except Exception as e:
        # Return error as JSON
        error_response = {"error": f"Failed to process file: {str(e)}"}
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    main()