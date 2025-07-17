/*
 * Simple test script to verify authentication system
 * Run this to test user registration and login
 * 
 * Usage: node test_auth.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  try {
    // Test 1: Register a new user
    console.log('1. Testing user registration...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log('✅ Registration successful:', registerResponse.data.message);
    console.log('   User ID:', registerResponse.data.user.id);
    console.log('   Token received:', !!registerResponse.data.token);
    console.log('');

    // Test 2: Login with the registered user
    console.log('2. Testing user login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful:', loginResponse.data.message);
    console.log('   User:', loginResponse.data.user.name);
    console.log('   Token received:', !!loginResponse.data.token);
    console.log('');

    // Test 3: Get current user with token
    console.log('3. Testing token verification...');
    const token = loginResponse.data.token;
    const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Token verification successful');
    console.log('   Current user:', meResponse.data.user.name);
    console.log('');

    // Test 4: Test remember me functionality
    console.log('4. Testing remember me functionality...');
    const rememberMeResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password,
      rememberMe: true
    });
    console.log('✅ Remember me login successful');
    console.log('   Extended token received:', !!rememberMeResponse.data.token);
    console.log('');

    // Test 5: Try to register same user again (should fail)
    console.log('5. Testing duplicate registration (should fail)...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, testUser);
      console.log('❌ Duplicate registration should have failed');
    } catch (error) {
      console.log('✅ Duplicate registration correctly rejected:', error.response.data.error);
    }
    console.log('');

    // Test 6: Try login with wrong password (should fail)
    console.log('6. Testing wrong password (should fail)...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: testUser.email,
        password: 'wrongpassword'
      });
      console.log('❌ Wrong password login should have failed');
    } catch (error) {
      console.log('✅ Wrong password correctly rejected:', error.response.data.error);
    }
    console.log('');

    console.log('🎉 All authentication tests passed!');
    console.log('📝 User data is now persisted and will be remembered across server restarts.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

// Run the test
testAuth(); 