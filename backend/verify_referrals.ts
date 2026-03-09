import { supabaseAdmin } from './src/lib/supabase.js';

async function test() {
    console.log('--- Checking Referral Tables ---');

    const { data: sources, error: e1 } = await supabaseAdmin.from('referral_sources').select('*').limit(1);
    console.log('referral_sources error:', e1);

    const { data: schemes, error: e2 } = await supabaseAdmin.from('referral_schemes').select('*').limit(1);
    console.log('referral_schemes error:', e2);

    const { data: rewards, error: e3 } = await supabaseAdmin.from('referral_rewards').select('*, claimed_at').limit(1);
    console.log('referral_rewards error:', e3);

    console.log('Verification Complete');
}

test();
