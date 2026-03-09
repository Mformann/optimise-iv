import { supabaseAdmin } from './src/lib/supabase.js';

async function test() {
    console.log('Sending query to reload schema cache...');
    const { error } = await supabaseAdmin.rpc('reload_schema'); // Not standard but let's try or we use a raw SQL if we can. 
    // Wait, Supabase js doesn't have raw SQL execution typically unless via RPC.
    console.log('Done:', error);
}

test();
