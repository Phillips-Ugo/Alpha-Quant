const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const userService = require('../services/userService');

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Create new user using the service
    const user = await userService.createUser(email, password, name);
    
    // Generate JWT token
    const token = userService.generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Authenticate user using the service
    const user = await userService.authenticateUser(email, password);
    
    // Generate JWT token with extended expiration if remember me is checked
    const tokenExpiration = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: tokenExpiration }
    );

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Verify token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = userService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.userId);
    res.json({ user });
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// Admin route to get all users (for debugging - remove in production)
router.get('/admin/users', authenticateToken, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router; 