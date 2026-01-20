const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    await client.connect();
    console.log("--- Checking PaymentLogs ---");
    const res = await client.query('SELECT id, amount, "createdAt", note FROM "PaymentLog" ORDER BY "createdAt" DESC LIMIT 10');
    console.log(`Found ${res.rowCount} logs.`);
    console.log(res.rows);

    console.log("\n--- Checking Orders ---");
    const res2 = await client.query('SELECT id, "totalValue", "createdAt" FROM "Order" ORDER BY "createdAt" DESC LIMIT 5');
    console.log(`Found ${res2.rowCount} orders.`);
    console.log(res2.rows);

    await client.end();
}

main();
