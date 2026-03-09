import { clinicRepository } from './src/repositories/clinic.repository.js';
import { userRepository } from './src/repositories/user.repository.js';

async function test() {
    try {
        console.log('Testing clinic creation...');
        await clinicRepository.create({
            name: 'Test Clinic 2',
            address: '123 Test St',
            city: 'Testville',
            phone: '1234567890',
            email: 'test2@clinic.com',
            location_type: 'clinic'
        });
        console.log('Clinic creation successful');
    } catch (err: any) {
        console.log('CLINIC_ERROR_START');
        console.log(JSON.stringify(err, null, 2));
        console.log('CLINIC_ERROR_END');
    }

    try {
        console.log('\nTesting user creation...');
        await userRepository.create({
            email: 'test2@user.com',
            password: 'password123',
            name: 'Test User 2',
            role: 'admin',
            phone: '1234567890'
        });
        console.log('User creation successful');
    } catch (err: any) {
        console.log('USER_ERROR_START');
        console.log(JSON.stringify(err, null, 2));
        console.log('USER_ERROR_END');
    }
}

test();
