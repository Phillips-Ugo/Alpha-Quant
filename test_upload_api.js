const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    // First, register a test user
    console.log('Registering test user...');
    try {
      await axios.post('http://localhost:5001/api/auth/register', {
        email: 'test@upload.com',
        password: 'password123',
        name: 'Test User'
      });
      console.log('Test user registered');
    } catch (regError) {
      console.log('User might already exist, proceeding to login...');
    }

    // Now log in
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'test@upload.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');

    // Now test the upload
    console.log('Testing file upload...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./test_upload.txt'));

    const uploadResponse = await axios.post('http://localhost:5001/api/upload/portfolio', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Upload successful!');
    console.log('Response:', uploadResponse.data);

    // Check if portfolio was updated
    console.log('Checking portfolio...');
    const portfolioResponse = await axios.get('http://localhost:5001/api/portfolio', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Portfolio data:', portfolioResponse.data);

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testUpload();
