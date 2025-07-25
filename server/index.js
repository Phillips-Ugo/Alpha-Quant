const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());

// CORS configuration for production and development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || true
    : 'http://localhost:3000',
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/news', require('./routes/news'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api', require('./routes/market'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join-portfolio', (portfolioId) => {
    socket.join(`portfolio-${portfolioId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve static files in production and development
const clientBuildPath = path.join(__dirname, '../client/build');
console.log('Looking for client build at:', clientBuildPath);

if (process.env.NODE_ENV === 'production') {
  // Check if build directory exists
  const fs = require('fs');
  if (fs.existsSync(clientBuildPath)) {
    console.log('✅ Client build directory found');
    app.use(express.static(clientBuildPath));
  } else {
    console.log('❌ Client build directory not found');
  }
}

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  if (!req.url.startsWith('/api/')) {
    const indexPath = path.join(clientBuildPath, 'index.html');
    if (process.env.NODE_ENV === 'production') {
      res.sendFile(indexPath);
    } else {
      res.json({ message: 'API is running. Frontend should be served separately in development.' });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io }; 