const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserService {
  constructor() {
    this.usersFilePath = path.join(__dirname, '../data/users.json');
    this.users = [];
    this.loadUsers();
  }

  async loadUsers() {
    try {
      const data = await fs.readFile(this.usersFilePath, 'utf8');
      this.users = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is empty, start with empty array
      this.users = [];
      await this.saveUsers();
    }
  }

  async saveUsers() {
    try {
      await fs.writeFile(this.usersFilePath, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
      throw new Error('Failed to save user data');
    }
  }

  async createUser(email, password, name) {
    // Validate input
    if (!email || !password || !name) {
      throw new Error('All fields are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUser = this.users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      portfolio: [],
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    this.users.push(newUser);
    await this.saveUsers();

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    };
  }

  async authenticateUser(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    await this.saveUsers();

    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  }

  async getUserById(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  }

  async updateUser(userId, updates) {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Only allow updating certain fields
    const allowedUpdates = ['name', 'email'];
    const user = this.users[userIndex];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        user[key] = value;
      }
    }

    await this.saveUsers();

    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  }

  async deleteUser(userId) {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    this.users.splice(userIndex, 1);
    await this.saveUsers();
  }

  async getAllUsers() {
    return this.users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }));
  }

  generateToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' } // Extended token expiration
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new UserService(); 