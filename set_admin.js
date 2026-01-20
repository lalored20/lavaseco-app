const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    await client.connect();

    const email = 'rutaexitosa2@gmail.com';

    // Update to ADMIN
    await client.query(`UPDATE "User" SET role = 'ADMIN', name = 'Jefe' WHERE email = $1`, [email]);

    console.log(`✅ Usuario ${email} actualizado a ADMIN (Jefe).`);

    const res = await client.query('SELECT id, email, role, name FROM "User"');
    console.log("Estado Final DB:", res.rows);

    await client.end();
}

main();
