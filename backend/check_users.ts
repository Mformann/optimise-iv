import { initDatabase, query } from './src/database/index.js';

const checkUsers = async () => {
    try {
        await initDatabase();
        const users = query("SELECT email, role, is_active, password_hash FROM users");
        if (users.length > 0) {
            console.log("Users found:", users.length);
            users.forEach((user: any) => {
                console.log(`Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}, HashLen: ${user.password_hash?.length}`);
            });
        } else {
            console.log("No users found in the database. You may need to run 'npm run seed'.");
        }
    } catch (err) {
        console.error("Error checking users:", err);
    }
};

checkUsers();
