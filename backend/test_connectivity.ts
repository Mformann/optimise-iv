import { initDatabase, query, queryOne, run } from './src/database/index.js';
import { v4 as uuidv4 } from 'uuid';

await initDatabase();

const BASE = 'http://localhost:3000/api';

// Login
const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@clinic.com', password: 'admin123' }),
});
const loginData = await loginRes.json() as any;
const TOKEN = loginData.data.token;
const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` };
console.log('=== Logged in as:', loginData.data.user.name, '===\n');

// Ensure we have test data
const doctor = queryOne<any>("SELECT * FROM users WHERE role = 'doctor' LIMIT 1");
const clinic = queryOne<any>('SELECT * FROM clinics LIMIT 1');

// Ensure a drip exists
let drip = queryOne<any>('SELECT * FROM drips WHERE is_active = 1 AND stock_quantity > 5 LIMIT 1');
if (!drip) {
  const dripId = uuidv4();
  const now = new Date().toISOString();
  run(`INSERT INTO drips (id, name, description, price, stock_quantity, is_active, created_at, updated_at)
       VALUES (?, 'Test Vitamin C Drip', 'Test drip', 150, 50, 1, ?, ?)`, [dripId, now, now]);
  drip = queryOne<any>('SELECT * FROM drips WHERE id = ?', [dripId]);
  console.log('Created test drip:', drip.name);
}

// Ensure a partner exists and patient has partner_id
let partner = queryOne<any>('SELECT * FROM partners WHERE is_active = 1 LIMIT 1');
if (!partner) {
  const pid = uuidv4();
  const now = new Date().toISOString();
  run(`INSERT INTO partners (id, name, commission_type, commission_value, is_active, created_at, updated_at)
       VALUES (?, 'Test Partner', 'percentage', 10, 1, ?, ?)`, [pid, now, now]);
  partner = queryOne<any>('SELECT * FROM partners WHERE id = ?', [pid]);
  console.log('Created test partner:', partner.name);
}

// Get patient and set partner_id + referred_by
const patient = queryOne<any>('SELECT * FROM patients LIMIT 1');
const patient2 = queryOne<any>('SELECT * FROM patients WHERE id != ? LIMIT 1', [patient.id]);

if (!patient.partner_id) {
  run('UPDATE patients SET partner_id = ? WHERE id = ?', [partner.id, patient.id]);
  console.log('Set partner_id on patient:', patient.first_name);
}

// Set up referral if second patient exists
if (patient2 && !patient.referred_by_patient_id) {
  run('UPDATE patients SET referred_by_patient_id = ? WHERE id = ?', [patient2.id, patient.id]);
  console.log('Set referred_by_patient_id on patient');
}

// Ensure referral scheme exists
let scheme = queryOne<any>('SELECT * FROM referral_schemes WHERE is_active = 1 LIMIT 1');
if (!scheme) {
  const sid = uuidv4();
  const now = new Date().toISOString();
  run(`INSERT INTO referral_schemes (id, name, reward_type, reward_value, min_referrals, is_active, created_at, updated_at)
       VALUES (?, 'First Visit Reward', 'cash', 50, 1, 1, ?, ?)`, [sid, now, now]);
  scheme = queryOne<any>('SELECT * FROM referral_schemes WHERE id = ?', [sid]);
  console.log('Created referral scheme:', scheme.name);
}

// Clear previous completed appointments for this patient so referral fires
// (only if this patient has no completed appointments yet)
const completedCount = queryOne<any>("SELECT COUNT(*) as cnt FROM appointments WHERE patient_id = ? AND status = 'completed'", [patient.id]);
console.log('Patient completed appointments before test:', completedCount?.cnt);

console.log('\nDoctor:', doctor?.name);
console.log('Clinic:', clinic?.name);
console.log('Drip:', drip?.name, '| price:', drip?.price, '| stock:', drip?.stock_quantity);
console.log('Partner:', partner?.name, '| commission:', partner?.commission_type, partner?.commission_value);
console.log('');

// ========================================
// TEST 1: Complete appointment WITH payment (atomic)
// ========================================
console.log('=== TEST 1: Complete appointment with payment ===');

const createRes = await fetch(`${BASE}/appointments`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    patient_id: patient.id,
    doctor_id: doctor!.id,
    clinic_id: clinic!.id,
    type: 'drip',
    scheduled_date: '2026-02-18',
    scheduled_time: '10:00',
    duration_minutes: 30,
  }),
});
const createData = await createRes.json() as any;
if (!createData.success) {
  console.log('Create failed:', createData.error);
  // Try different time
  const createRes2 = await fetch(`${BASE}/appointments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      patient_id: patient.id,
      doctor_id: doctor!.id,
      clinic_id: clinic!.id,
      type: 'drip',
      scheduled_date: '2026-02-19',
      scheduled_time: '14:00',
      duration_minutes: 30,
    }),
  });
  const cd2 = await createRes2.json() as any;
  if (!cd2.success) {
    console.log('Create still failed:', cd2.error);
    process.exit(1);
  }
  Object.assign(createData, cd2);
}
const aptId1 = createData.data.id;
console.log('Created appointment:', aptId1);

// Start appointment
await fetch(`${BASE}/appointments/${aptId1}/start`, { method: 'POST', headers });
console.log('Started appointment');

// Complete with payment
const completeRes = await fetch(`${BASE}/appointments/${aptId1}/complete`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    completion_notes: 'Test completion with payment',
    remarks: 'All good',
    final_price: drip!.price * 2,
    drips: [{ drip_id: drip!.id, quantity: 2, price: drip!.price }],
    payment: {
      use_credits: true,
      use_wallet: false,
      cash_amount: drip!.price * 2,
      card_amount: 0,
      pay_later: false,
    },
  }),
});
const completeData = await completeRes.json() as any;
console.log('Complete response success:', completeData.success);
if (!completeData.success) {
  console.log('ERROR:', completeData.error);
} else {
  console.log('Payment:', JSON.stringify(completeData.payment));
}

// Verify appointment payment_status
const apt1 = queryOne<any>('SELECT status, payment_status FROM appointments WHERE id = ?', [aptId1]);
console.log('VERIFY - status:', apt1?.status, '| payment_status:', apt1?.payment_status);
console.log(apt1?.payment_status === 'paid' ? '  PASS: payment_status = paid' : '  FAIL: expected paid, got ' + apt1?.payment_status);

// Verify wallet_transactions reference_type
const wt1 = query<any>('SELECT type, amount, payment_method, reference_type FROM wallet_transactions WHERE reference_id = ?', [aptId1]);
console.log('Wallet transactions for appointment:');
for (const t of wt1) {
  console.log(`  type=${t.type} amount=${t.amount} method=${t.payment_method} ref_type=${t.reference_type}`);
}
const allAppointmentType = wt1.every((t: any) => t.reference_type === 'appointment');
console.log(allAppointmentType ? '  PASS: all reference_type = appointment' : '  FAIL: some reference_type != appointment');

// Check partner commission
const commissions = query<any>('SELECT * FROM partner_commissions WHERE appointment_id = ?', [aptId1]);
console.log('Partner commissions:', commissions.length);
if (commissions.length > 0) {
  console.log('  PASS: Commission created, amount:', commissions[0].amount, '| status:', commissions[0].status);
} else {
  console.log('  INFO: No commission (partner may not be set on patient)');
}

// Check referral reward
const rewards = query<any>('SELECT * FROM referral_rewards WHERE referred_patient_id = ?', [patient.id]);
console.log('Referral rewards:', rewards.length);
if (rewards.length > 0) {
  console.log('  PASS: Referral reward created, scheme_id:', rewards[0].scheme_id);
} else {
  console.log('  INFO: No reward (may not be first appointment or no referrer)');
}
console.log('');

// ========================================
// TEST 2: Complete appointment WITHOUT payment
// ========================================
console.log('=== TEST 2: Complete appointment without payment ===');

const createRes2 = await fetch(`${BASE}/appointments`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    patient_id: patient.id,
    doctor_id: doctor!.id,
    clinic_id: clinic!.id,
    type: 'consulting',
    scheduled_date: '2026-02-19',
    scheduled_time: '11:00',
    duration_minutes: 30,
  }),
});
const createData2 = await createRes2.json() as any;
const aptId2 = createData2.data.id;
console.log('Created appointment:', aptId2);

await fetch(`${BASE}/appointments/${aptId2}/start`, { method: 'POST', headers });

const completeRes2 = await fetch(`${BASE}/appointments/${aptId2}/complete`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    completion_notes: 'Consultation only',
    remarks: 'No drips needed',
  }),
});
const completeData2 = await completeRes2.json() as any;
console.log('Complete response success:', completeData2.success);

const apt2 = queryOne<any>('SELECT status, payment_status FROM appointments WHERE id = ?', [aptId2]);
console.log('VERIFY - status:', apt2?.status, '| payment_status:', apt2?.payment_status);
console.log(apt2?.payment_status === 'unpaid' ? '  PASS: payment_status = unpaid' : '  FAIL: expected unpaid, got ' + apt2?.payment_status);
console.log('');

// ========================================
// TEST 3: Drip order delivery with payment (atomic)
// ========================================
console.log('=== TEST 3: Drip order delivery with payment ===');

const stockBefore = queryOne<any>('SELECT stock_quantity FROM drips WHERE id = ?', [drip!.id]);
console.log('Stock before:', stockBefore?.stock_quantity);

const orderRes = await fetch(`${BASE}/drip-orders`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    patient_id: patient.id,
    drip_id: drip!.id,
    quantity: 1,
    clinic_id: clinic!.id,
    notes: 'Test order',
  }),
});
const orderData = await orderRes.json() as any;
if (!orderData.success) {
  console.log('Create order failed:', orderData.error);
  process.exit(1);
}
const orderId = orderData.data.id;
console.log('Created drip order:', orderId);

const deliverRes = await fetch(`${BASE}/drip-orders/${orderId}/deliver`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    delivery_notes: 'Delivered successfully',
    payment: {
      use_credits: true,
      use_wallet: false,
      cash_amount: drip!.price,
      card_amount: 0,
      pay_later: false,
    },
  }),
});
const deliverData = await deliverRes.json() as any;
console.log('Deliver response success:', deliverData.success);
if (!deliverData.success) {
  console.log('ERROR:', deliverData.error);
} else {
  console.log('Order status:', deliverData.data?.status);
}

const stockAfter = queryOne<any>('SELECT stock_quantity FROM drips WHERE id = ?', [drip!.id]);
console.log('Stock after:', stockAfter?.stock_quantity);
console.log(stockAfter?.stock_quantity === stockBefore?.stock_quantity - 1
  ? '  PASS: Stock deducted by 1'
  : `  FAIL: Expected ${stockBefore?.stock_quantity - 1}, got ${stockAfter?.stock_quantity}`);

const wt3 = query<any>('SELECT type, amount, payment_method, reference_type FROM wallet_transactions WHERE reference_id = ?', [orderId]);
console.log('Wallet transactions for drip order:');
for (const t of wt3) {
  console.log(`  type=${t.type} amount=${t.amount} method=${t.payment_method} ref_type=${t.reference_type}`);
}
const allDripOrderType = wt3.every((t: any) => t.reference_type === 'drip_order');
console.log(allDripOrderType ? '  PASS: all reference_type = drip_order' : '  FAIL: some reference_type != drip_order');

const orderDb = queryOne<any>('SELECT status, delivered_by FROM drip_orders WHERE id = ?', [orderId]);
console.log('DB order status:', orderDb?.status);
console.log(orderDb?.status === 'delivered' ? '  PASS: Order marked delivered' : '  FAIL: expected delivered');
console.log('');

// ========================================
// Summary
// ========================================
console.log('=== SUMMARY ===');
const allWt = query<any>('SELECT reference_type, COUNT(*) as cnt FROM wallet_transactions GROUP BY reference_type');
for (const g of allWt) {
  console.log(`  reference_type=${g.reference_type}: ${g.cnt} rows`);
}
const allApt = query<any>('SELECT payment_status, COUNT(*) as cnt FROM appointments GROUP BY payment_status');
for (const g of allApt) {
  console.log(`  payment_status=${g.payment_status}: ${g.cnt} rows`);
}

console.log('\n=== ALL BACKEND TESTS COMPLETE ===');
