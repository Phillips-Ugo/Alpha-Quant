# Financial Analysis App

A comprehensive financial analysis web application with AI-powered insights, portfolio management, and market analysis. Built with React, Node.js, and modern web technologies.

## 🚀 Features

### Core Features
- **Portfolio Management**: Track and manage your stock holdings with real-time performance data
- **AI Financial Advisor**: Chat with an AI-powered financial advisor for personalized insights
- **Market News & Events**: Stay informed with real-time market news and sentiment analysis
- **RAG-Powered Portfolio Upload**: Upload portfolio files (PDF, CSV, Excel) with intelligent data extraction
- **Interactive Charts**: Beautiful visualizations of portfolio performance and market data
- **Personalized Recommendations**: Get AI-generated recommendations based on your portfolio and market conditions

### Technical Features
- **Modern UI/UX**: Built with React, Tailwind CSS, and Framer Motion
- **Real-time Data**: Live stock prices and market updates
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Secure Authentication**: JWT-based authentication with password hashing
- **File Upload**: Support for multiple file formats with intelligent parsing
- **API Integration**: Ready for real stock data APIs (Alpha Vantage, Yahoo Finance, etc.)

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Beautiful and responsive charts
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Hot Toast** - Toast notifications
- **Framer Motion** - Animation library
- **Heroicons** - Beautiful SVG icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **PDF Parse** - PDF text extraction
- **Socket.io** - Real-time communication
- **Helmet** - Security middleware
- **Rate Limiting** - API rate limiting

### Development Tools
- **Nodemon** - Auto-restart server during development
- **Concurrently** - Run multiple commands simultaneously
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Setup Instructions

1. **Clone the repository**
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

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit the .env file with your configuration
   nano .env
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately:
   # Backend only
   npm run server
   
   # Frontend only
   npm run client
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=your-openai-api-key-here

# Stock API Configuration
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
YAHOO_FINANCE_API_KEY=your-yahoo-finance-api-key

# News API Configuration
NEWS_API_KEY=your-news-api-key
```

### API Keys Setup

To get real data, you'll need to sign up for the following APIs:

1. **Alpha Vantage** (Stock Data): https://www.alphavantage.co/
2. **Yahoo Finance** (Alternative Stock Data): https://finance.yahoo.com/
3. **OpenAI** (AI Features): https://openai.com/
4. **News API** (Market News): https://newsapi.org/

## 📱 Usage

### Getting Started

1. **Sign Up**: Create a new account with your email and password
2. **Add Portfolio**: Either manually enter your stocks or upload a portfolio file
3. **Explore Dashboard**: View your portfolio performance and market overview
4. **Chat with AI**: Ask questions about your portfolio and get personalized advice
5. **Stay Informed**: Check the news section for market updates and recommendations

### Portfolio Upload

The app supports uploading portfolio files in the following formats:
- **PDF**: Portfolio statements and reports
- **CSV**: Comma-separated values with stock data
- **Excel**: Spreadsheet files (.xlsx)

The RAG (Retrieval Augmented Generation) system will automatically extract:
- Stock symbols
- Number of shares
- Purchase prices
- Purchase dates

### AI Chat Features

The AI financial advisor can help with:
- Portfolio analysis and recommendations
- Market trend explanations
- Risk assessment
- Investment strategies
- Technical analysis insights

## 🏗️ Project Structure

```
Financial-Analysis/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── App.js         # Main app component
│   └── package.json
├── server/                # Node.js backend
│   ├── routes/           # API routes
│   │   ├── auth.js       # Authentication routes
│   │   ├── portfolio.js  # Portfolio management
│   │   ├── stocks.js     # Stock data
│   │   ├── ai.js         # AI chat
│   │   ├── news.js       # News and events
│   │   └── upload.js     # File upload
│   └── index.js          # Server entry point
├── package.json          # Root package.json
└── README.md
```

## 🚀 Deployment

### Production Build

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Set environment variables for production**
   ```bash
   NODE_ENV=production
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Deployment Options

- **Heroku**: Easy deployment with Git integration
- **Vercel**: Great for frontend deployment
- **AWS**: Scalable cloud deployment
- **DigitalOcean**: VPS deployment

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Helmet security headers
- Input validation and sanitization

## 🤝 Contributing

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
- Email: support@financialanalysis.com
- Documentation: [Wiki](https://github.com/your-repo/wiki)

---

**Note**: This is a demonstration project. For production use, ensure you have proper API keys, database setup, and security measures in place.
