import { clinicRepository } from './src/repositories/clinic.repository.js';
import { userRepository } from './src/repositories/user.repository.js';

async function test() {
    try {
        console.log('Testing clinic creation...');
        await clinicRepository.create({
            name: 'Test Clinic',
            address: '123 Test St',
            city: 'Testville',
            phone: '1234567890',
            email: 'test@clinic.com',
            location_type: 'clinic'
        });
        console.log('Clinic creation successful');
    } catch (err) {
        console.error('Clinic Error:', err);
    }

    try {
        console.log('\nTesting user creation...');
        await userRepository.create({
            email: 'test@user.com',
            password: 'password123',
            name: 'Test User',
            role: 'admin',
            phone: '1234567890'
        });
        console.log('User creation successful');
    } catch (err) {
        console.error('User Error:', err);
    }
}

test();
