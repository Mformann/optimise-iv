import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function loginAsAdmin() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@example.com',
    password: 'password123',
  });
  return response.data.token;
}

async function testEndpoints() {
  const token = await loginAsAdmin();
  const headers = { Authorization: `Bearer ${token}` };

  const endpoints = [
    { method: 'get', url: '/patients' },
    { method: 'post', url: '/patients', data: { name: 'John Doe', age: 30 } },
    { method: 'get', url: '/appointments' },
    { method: 'post', url: '/appointments', data: { patientId: '123', date: '2026-03-09' } },
    { method: 'get', url: '/users' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.url}`,
        headers,
        data: endpoint.data,
      });
      console.log(`SUCCESS: ${endpoint.method.toUpperCase()} ${endpoint.url}`, response.data);
    } catch (error) {
      console.error(`FAILURE: ${endpoint.method.toUpperCase()} ${endpoint.url}`, error.response?.data || error.message);
    }
  }
}

testEndpoints().catch((err) => console.error('Test script failed', err));