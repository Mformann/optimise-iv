import { clinicRepository } from './src/repositories/clinic.repository.js';
import { userRepository } from './src/repositories/user.repository.js';

async function test() {
    console.log('Testing getting all clinics...');
    const clinics = await clinicRepository.findAll();
    console.log('Clinics:', clinics.length);

    console.log('Testing getting all users...');
    try {
        const users = await userRepository.findAll();
        console.log('Users:', users.length);
    } catch (err) {
        console.error('User Error:', err);
    }
}

test();
