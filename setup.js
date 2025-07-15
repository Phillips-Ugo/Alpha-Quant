#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Financial Analysis App...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.error('❌ Node.js version 16 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version check passed:', nodeVersion);

// Check if package.json exists
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Please run this script from the project root directory.');
  process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing server dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Server dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install server dependencies');
  process.exit(1);
}

// Install client dependencies
console.log('\n📦 Installing client dependencies...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: 'client' });
  console.log('✅ Client dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install client dependencies');
  process.exit(1);
}

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('\n🔧 Creating .env file from template...');
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully');
    console.log('⚠️  Please edit the .env file with your API keys before starting the application');
  } catch (error) {
    console.error('❌ Failed to create .env file');
  }
} else if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
}

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('\n📁 Creating uploads directory...');
  try {
    fs.mkdirSync(uploadsDir);
    console.log('✅ Uploads directory created successfully');
  } catch (error) {
    console.error('❌ Failed to create uploads directory');
  }
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Edit the .env file with your API keys');
console.log('2. Run "npm run dev" to start the development servers');
console.log('3. Open http://localhost:3000 in your browser');
console.log('\n📚 For more information, check the README.md file');

console.log('\n🔑 Required API Keys:');
console.log('- OpenAI API Key (for AI features)');
console.log('- Alpha Vantage API Key (for stock data)');
console.log('- News API Key (for market news)');

console.log('\n💡 Tip: You can start the app without API keys for demo purposes, but real data will be limited.'); 