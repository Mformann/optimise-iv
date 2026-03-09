import { initDatabase, query } from './src/database/index.js';

await initDatabase();

console.log('=== Schema Check ===');
const aptCols = query<{ name: string }>('PRAGMA table_info(appointments)');
const ps = aptCols.find(c => c.name === 'payment_status');
console.log('appointments.payment_status:', ps ? 'EXISTS' : 'MISSING');

const wtCols = query<{ name: string }>('PRAGMA table_info(wallet_transactions)');
const rt = wtCols.find(c => c.name === 'reference_type');
console.log('wallet_transactions.reference_type:', rt ? 'EXISTS' : 'MISSING');

console.log('=== Backfill Results ===');
const wtGroups = query<{ reference_type: string; cnt: number }>('SELECT reference_type, COUNT(*) as cnt FROM wallet_transactions GROUP BY reference_type');
for (const g of wtGroups) {
  console.log(`  reference_type=${g.reference_type}: ${g.cnt} rows`);
}

const aptGroups = query<{ payment_status: string; cnt: number }>('SELECT payment_status, COUNT(*) as cnt FROM appointments GROUP BY payment_status');
for (const g of aptGroups) {
  console.log(`  payment_status=${g.payment_status}: ${g.cnt} rows`);
}
