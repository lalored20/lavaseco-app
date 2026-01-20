const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    await client.connect();
    const res = await client.query('SELECT id, email, role, name FROM "User"');
    console.log("Usuarios en DB:", res.rows);
    await client.end();
}

main();
