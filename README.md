# Alpha Quant!

**Developed by: Ugochukwu Belusochim**

A comprehensive financial analysis web application with AI-powered insights, portfolio management, and market analysis. Built with React, Node.js, and modern web technologies.

## 🚀 Features

### Core Features
- **Smart Portfolio Upload**: Upload portfolio files (PDF, CSV, Excel, TXT) with RAG-powered AI extraction
- **Portfolio Management**: Track and manage your stock holdings with real-time performance data
- **AI Financial Advisor**: Chat with an AI-powered (fine-tuned) financial advisor for personalized insights
- **Market Dashboard**: Real-time market data, news, and comprehensive analytics
- **Interactive Visualizations**: Beautiful charts and graphs for portfolio performance analysis

### AI-Powered Features
- **RAG (Retrieval-Augmented Generation)**: Intelligent document processing for portfolio extraction
- **LangChain Integration**: Advanced natural language processing for financial documents
- **OpenAI GPT Integration**: Conversational AI for financial advice and insights
- **Sentiment Analysis**: Market sentiment analysis using FinBERT models
- **LSTM Predictions**: Advanced machine learning models for stock price predictions and forecasting

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Beautiful and responsive charts
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Hot Toast** - Toast notifications
- **React Dropzone** - File upload with drag & drop
- **Heroicons** - Beautiful SVG icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **pdf-parse** - PDF text extraction
- **xlsx** - Excel file processing
- **Socket.io** - Real-time communication
- **Helmet** - Security middleware
- **Yahoo Finance API** - Real-time stock data

### AI & Machine Learning
- **Python** - Machine learning backend
- **LangChain** - LLM application framework
- **OpenAI API** - GPT models for AI features
- **FAISS** - Vector database for semantic search
- **TensorFlow/Keras** - LSTM models for predictions
- **pandas** - Data manipulation and analysis
- **yfinance** - Yahoo Finance data extraction

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

   ```bash
   git clone <repository-url>
   cd Financial-Analysis
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Python** (v3.8 or higher) for AI features
- **Git** for version control

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Phillips-Ugo/Alpha-Quant.git
   cd Alpha-Quant
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   
   # Install Python dependencies for AI features
   cd ml
   pip install -r requirements.txt
   cd ..
   ```

3. **Environment Configuration**
   ```bash
   # Create and configure environment file
   cp .env.example .env
   # Edit .env with your API keys (see configuration section below)
   ```

4. **Start the application**
   ```bash
   # Start the backend server (from root directory)
   npm start
   
   # In a new terminal, start the frontend (optional - already served by backend)
   cd client
   npm start
   ```

5. **Access the application**
   - Application: http://localhost:5000
   - API Documentation: http://localhost:5000/api

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI Configuration (Required for AI features)
OPENAI_API_KEY=your-openai-api-key-here

# Stock API Configuration (Optional - demo data available)
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
YAHOO_FINANCE_API_KEY=your-yahoo-finance-api-key

# News API Configuration (Optional)
NEWS_API_KEY=your-news-api-key

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Required API Keys

To enable full functionality, you'll need:

1. **OpenAI API Key** (Required for portfolio upload AI features)
   - Sign up at: https://openai.com/
   - Required for RAG-powered document processing

2. **Alpha Vantage** (Optional - for enhanced stock data)
   - Sign up at: https://www.alphavantage.co/

3. **News API** (Optional - for market news)
   - Sign up at: https://newsapi.org/

## 📱 Usage

1. **Portfolio Management**
   - **Manual Entry**: Add stocks individually with symbol, shares, and purchase details
   - **Smart Upload**: Upload portfolio files (PDF, CSV, Excel, TXT) for automatic extraction
   - **Real-time Tracking**: View current prices, gains/losses, and portfolio performance
   - **Interactive Charts**: Visualize portfolio allocation and performance trends

2. **AI-Powered Features**
   - **RAG Upload**: Upload any portfolio document and let AI extract the data
   - **Financial Chat**: Ask questions about your portfolio and market trends
   - **Smart Analysis**: Get AI-generated insights and recommendations
   - **Sentiment Analysis**: Market sentiment from news and social media

3. **Market Dashboard**
   - **Real-time Data**: Live stock prices and market indicators
   - **News Feed**: Latest financial news and market updates
   - **Market Analysis**: Technical indicators and trend analysis

### Portfolio Upload Guide

The app supports intelligent extraction from multiple file formats:

**Supported Formats:**
- 📄 **PDF**: Brokerage statements, portfolio reports
- 📊 **Excel (.xlsx)**: Spreadsheets with portfolio data
- 📝 **CSV**: Comma-separated value files
- 📄 **Text**: Plain text files with stock information

**Extraction Process:**
1. Upload your file using drag & drop or file picker
2. AI-powered RAG system analyzes the document
3. Extracts stock symbols, shares, prices, and dates
4. Validates data and fetches current market prices
5. Adds validated stocks to your portfolio

**Example Portfolio Format:**
```
My Portfolio Holdings:
AAPL: 100 shares at $150 per share
MSFT: 50 shares purchased at $300 each
TSLA - 25 shares, bought for $250 per share
```

## 🏗️ Project Structure

```
Alpha Quant/
├── client/                 # React frontend application
│   ├── public/            # Static files and assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React context providers
│   │   ├── pages/         # Main page components
│   │   └── App.js         # Root application component
│   └── package.json       # Frontend dependencies
├── server/                # Node.js backend server
│   ├── data/             # JSON data storage
│   ├── routes/           # API route handlers
│   │   ├── auth.js       # User authentication
│   │   ├── portfolio.js  # Portfolio management
│   │   ├── stocks.js     # Stock data APIs
│   │   ├── ai.js         # AI chat functionality
│   │   ├── news.js       # News and market data
│   │   └── upload.js     # File upload & processing
│   ├── services/         # Business logic services
│   └── index.js          # Server entry point
├── ml/                   # Python AI/ML components
│   ├── rag_portfolio.py  # RAG document processing
│   ├── lstm_*.py         # LSTM prediction models
│   ├── bert_*.py         # BERT sentiment analysis
│   └── requirements.txt  # Python dependencies
├── .env                  # Environment configuration
├── package.json          # Root package.json
└── README.md             # Project documentation
```

## 🔒 Security & Performance

- **Authentication**: JWT-based secure user authentication
- **Data Protection**: bcrypt password hashing and validation
- **API Security**: Rate limiting, CORS, and Helmet security headers
- **File Validation**: Secure file upload with type and size validation
- **Error Handling**: Comprehensive error handling and logging
- **Performance**: Caching, compression, and optimized database queries

## 🚀 Production Deployment

### Building for Production

```bash
# Build the React frontend
cd client
npm run build
cd ..

# Set production environment
export NODE_ENV=production

# Start the production server
npm start
```

### Environment Setup

For production, ensure these environment variables are set:
- `NODE_ENV=production`
- `JWT_SECRET` (strong secret key)
- `OPENAI_API_KEY` (for AI features)
- `PORT` (default: 5000)

## 📊 Performance Features

- **Real-time Updates**: Live stock price updates via WebSocket
- **Caching**: Intelligent caching of market data and user sessions
- **Lazy Loading**: Components and routes loaded on demand
- **Optimized Queries**: Efficient database queries and API calls
- **Responsive Design**: Optimized for all device sizes

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style and conventions
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting

## 👨‍💻 Author

**Ugochukwu Belusochim**
- GitHub: [@Phillips-Ugo](https://github.com/Phillips-Ugo)
- Project: [Alpha Quant Financial Analysis Platform](https://github.com/Phillips-Ugo/Alpha-Quant)

## 🙏 Acknowledgments

- OpenAI for GPT models and AI capabilities
- Yahoo Finance for real-time market data
- LangChain for RAG implementation
- React and Node.js communities for excellent frameworks
- All contributors and users of Alpha Quant

---

**Built with ❤️ by Ugochukwu Belusochim**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Recharts** for beautiful chart components
- **Tailwind CSS** for the utility-first CSS framework
- **Heroicons** for the beautiful icon set
- **React Hot Toast** for elegant notifications

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Email: ugochukwubelusochim.stu@gmail.comcom

---

**Note**: This is a demonstration project. For production use, ensure you have proper API keys, database setup, and security measures in place.
