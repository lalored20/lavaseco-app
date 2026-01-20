const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    await client.connect();
    const email = 'rmendivilmora2@gmail.com';
    const res = await client.query('SELECT email, "verificationCode" FROM "User" WHERE email = $1', [email]);
    console.log("Código de verificación:", res.rows[0]);
    await client.end();
}

main();
