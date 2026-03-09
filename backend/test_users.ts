import { initDatabase, query } from './src/database/index.js';
await initDatabase();
const users = query<{ email: string; role: string }>('SELECT  email, role FROM users LIMIT 5');
for (const u of users) console.log(u.email, u.role);
