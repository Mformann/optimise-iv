import { partnerRepository } from './src/repositories/partner.repository.js';
import { supabaseAdmin } from './src/lib/supabase.js';

async function test() {
    console.log('\n--- Partner Insert Test ---');
    try {
        const pInsert = await partnerRepository.create({
            name: 'Test Partner',
            contact_name: 'Contact',
            email: 'p@p.com',
            phone: '1234',
            commission_type: 'percentage',
            commission_value: 10
        });
        console.log('Partner Insert Success:', pInsert);
    } catch (err: any) {
        console.log('PARTNER_ERROR_START');
        console.log(JSON.stringify(err, null, 2));
        console.log('PARTNER_ERROR_END');
    }
}

test();
