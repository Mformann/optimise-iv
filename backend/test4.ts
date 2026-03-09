import { clinicRepository } from './src/repositories/clinic.repository.js';
import { userRepository } from './src/repositories/user.repository.js';
import { supabaseAdmin } from './src/lib/supabase.js';

async function test() {
    console.log('--- Clinics Table Columns ---');
    const { data: cData, error: cErr } = await supabaseAdmin.from('clinics').select('*').limit(1);
    console.log('Clinics Error:', cErr);
    if (cData && cData.length > 0) {
        console.log(Object.keys(cData[0]));
    } else {
        console.log('No clinic data, trying limit 0 to just get column names? Supabase REST doesnt give columns if empty easily unless using csv..');
    }

    console.log('\n--- Users Table Columns ---');
    const { data: uData, error: uErr } = await supabaseAdmin.from('users').select('*').limit(1);
    console.log('Users Error:', uErr);
    if (uData && uData.length > 0) {
        console.log(Object.keys(uData[0]));
    }

    console.log('\n--- Clinic Insert Test ---');
    const cInsert = await supabaseAdmin.from('clinics').insert({
        name: 'Test',
        address: 'test',
        city: 'test',
        phone: '12',
        location_type: 'clinic'
    });
    console.log('Clinic Insert Error:');
    console.log(JSON.stringify(cInsert.error, null, 2));

    console.log('\n--- User Insert Test ---');
    const uInsert = await supabaseAdmin.from('users').insert({
        email: 'test' + Date.now() + '@test.com',
        password_hash: 'hash',
        name: 'Test',
        role: 'admin'
    });
    console.log('User Insert Error:');
    console.log(JSON.stringify(uInsert.error, null, 2));
}

test();
