const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- Verificando Datos ---");

        // 1. Check Orders
        const orderCount = await prisma.order.count();
        const lastOrder = await prisma.order.findFirst({
            orderBy: { id: 'desc' },
            include: { client: true, items: true }
        });

        console.log(`Total Órdenes (Facturas): ${orderCount}`);
        if (lastOrder) {
            console.log("Última Factura Creada:", {
                folio: lastOrder.id,
                total: lastOrder.totalValue,
                items: lastOrder.items.length,
                cliente: lastOrder.client.name
            });
        }

        // 2. Check Clients
        const clientCount = await prisma.client.count();
        console.log(`Total Clientes: ${clientCount}`);

    } catch (e) {
        console.error("Error consultando DB:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
