import { supabaseAdmin } from './src/lib/supabase.js';

async function test() {
    console.log('\n--- Partners Table Columns ---');
    const { data: pData, error: pErr } = await supabaseAdmin.from('partners').select('*').limit(1);
    console.log('Partners Error:', pErr);
    if (pData && pData.length > 0) {
        console.log(Object.keys(pData[0]));
    } else if (pData && pData.length === 0) {
        console.log("No data, inserting a dummy and deleting to get columns...");
        // we can't do this since insert fails.
        // Instead we can use a raw query if we had access, but we don't.
    }
}

test();
