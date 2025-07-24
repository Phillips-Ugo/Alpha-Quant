import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader # Allows us to read txt files
from langchain.text_splitter import RecursiveCharacterTextSplitter # Handles splitting documents into smaller chunks
from langchain_community.embeddings import OpenAIEmbeddings # Embeddings for vectorization
from langchain_community.vectorstores import FAISS # Vector store for similarity search (Vector DataBase)
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

# Load API key from the .env file
load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")


import getpass
import os

if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: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 ")
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

# Load and split our sample portfolio file
documents = load_and_split_documents("C:\\Users\\ugoch\\OneDrive\\Desktop\\Summer Projects\\FinancialAnalysis\\Financial-Analysis\\ml\\portfolio.txt")
print(f"Loaded {len(documents)} document chunks.")

# Ensure you have the OpenAI API key set in your environment or replace with your key

# Use OpenAI's embedding model to convert text to vectors
embeddings = OpenAIEmbeddings()

# Create a vector database (our "knowledge base") from the document chunks
db = FAISS.from_documents(documents, embeddings)

print("Vector database created successfully.")

# rag_portfolio.py (continue from above)


# Create a retriever from our vector database
retriever = db.as_retriever()

# Initialize the LLM (Large Language Model)
llm = ChatOpenAI(temperature=0) # temperature=0 makes the LLM more factual and less creative

# Create the RAG chain
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever,
    return_source_documents=True
)

# A function to ask questions
def ask_portfolio_question(query):
    result = qa_chain.invoke({"query": query})
    return result

# Let's ask some questions!
question = "Give me the ticker, number of shares, price bought for each stock in the portfolio and format it in a json format."
response = ask_portfolio_question(question)
import sys
import re
# Only print the JSON part (strip any log lines)
json_candidate = response['result']
if isinstance(json_candidate, str):
    # Try to extract JSON object from string
    match = re.search(r'({[\s\S]*})', json_candidate)
    if match:
        print(match.group(1))
    else:
        print(json_candidate)
else:
    print(json_candidate)