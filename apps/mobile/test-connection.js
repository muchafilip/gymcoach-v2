// Quick test to verify API connection
const API_URL = 'http://192.168.50.235:5129/api';

async function testConnection() {
  console.log('Testing connection to:', API_URL);

  try {
    const response = await fetch(`${API_URL}/equipment`);
    const data = await response.json();
    console.log('✓ Connection successful!');
    console.log(`✓ Received ${data.length} equipment items`);
    console.log('Sample:', data[0]);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
  }
}

testConnection();
