import axios from 'axios';

async function testSignup() {
    const url = 'http://localhost:5000/api/auth/signup';
    const userData = {
        email: `testuser_${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Test User',
        role: 'patient',
        phone: '1234567890'
    };

    try {
        console.log('Sending signup request...');
        const response = await axios.post(url, userData);
        console.log('Signup successful!');
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('Signup failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error message:', error.message);
        }
    }
}

testSignup();
