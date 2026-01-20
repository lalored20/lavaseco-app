const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs'); // You might need to install this or use a simple hash if dev env allows
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    await client.connect();

    console.log("🌱 Seeding Database...");

    try {
        // 1. Create Admin User
        const email = 'rutaexitosa2@gmail.com'; // User's main email
        // Use a simple hash or assume the app handles partial hashes in dev. 
        // Ideally we use the same hash logic. In the app it uses bcrypt. 
        // Let's use a known hash for '123456' or similar for testing? 
        // Or just re-insert the user and let them use the 'magic code' login.
        // The previous get_code.js showed retrieval works.

        // Check if user exists first to avoid dupes if run multiple times (though tables were dropped)
        const user = {
            id: uuidv4(),
            email: 'rutaexitosa2@gmail.com',
            name: 'Jefe (CEO)',
            role: 'ADMIN',
            passwordHash: '$2a$10$YourHashHereOrRandom', // Placeholder, login uses code mainly or existing hash mechanism
        };

        console.log("Creating Admin User...");
        await client.query(`
        INSERT INTO "User" (id, email, name, role, "passwordHash", "isVerified")
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', name = 'Jefe (CEO)'
    `, [user.id, user.email, user.name, user.role, user.passwordHash]);

        // 2. Create Clients
        const clients = [
            { id: '1010', name: 'Juan Perez', phone: '3001234567', cedula: '1010' },
            { id: '2020', name: 'Maria Rodriguez', phone: '3109876543', cedula: '2020' },
            { id: '3030', name: 'Carlos Empresario', phone: '3205551234', cedula: '3030' }
        ];

        for (const c of clients) {
            await client.query(`
            INSERT INTO "Client" (id, name, phone, cedula)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
        `, [c.id, c.name, c.phone, c.cedula]);
        }

        // 3. Create Orders (Facturas) & Items
        console.log("Creating Orders...");
        const orders = [
            // Order 1: Paid Cash (Today)
            {
                clientIndex: 0, items: [{ type: 'Camisa', qty: 2, price: 5000 }],
                total: 10000, paid: 10000, method: 'Efectivo', status: 'ENTREGADO'
            },
            // Order 2: Paid Digital (Today)
            {
                clientIndex: 1, items: [{ type: 'Edredón', qty: 1, price: 25000 }],
                total: 25000, paid: 25000, method: 'Nequi', status: 'PENDIENTE'
            },
            // Order 3: Partial Payment (Today)
            {
                clientIndex: 2, items: [{ type: 'Traje Completo', qty: 1, price: 30000 }],
                total: 30000, paid: 15000, method: 'Efectivo', status: 'PENDIENTE'
            }
        ];

        for (const o of orders) {
            const orderId = uuidv4();
            const client = clients[o.clientIndex];

            // Insert Order
            await client.query(`
            INSERT INTO "Order" (id, "ticketNumber", "clientId", "totalValue", "paidAmount", "paymentStatus", "status", "createdAt", "updatedAt")
            VALUES ($1, DEFAULT, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [
                orderId,
                client.id,
                o.total,
                o.paid,
                o.paid >= o.total ? 'PAGADO' : 'ABONO',
                o.status
            ]);

            // Insert Items
            for (const item of o.items) {
                await client.query(`
                INSERT INTO "OrderItem" (id, "orderId", "type", "quantity", "price")
                VALUES ($1, $2, $3, $4, $5)
            `, [uuidv4(), orderId, item.type, item.qty, item.price]);
            }

            // Insert Payment Log (so Cash Register sees it)
            if (o.paid > 0) {
                await client.query(`
                INSERT INTO "PaymentLog" (id, "orderId", "amount", "type", "note", "createdAt")
                VALUES ($1, $2, $3, 'ABONO', $4, NOW())
            `, [uuidv4(), orderId, o.paid, `Abono (${o.method})`]);
            }
        }

        console.log("✅ Database seeded with test data!");

    } catch (err) {
        console.error("Error seeding:", err);
    } finally {
        await client.end();
    }
}

main();
