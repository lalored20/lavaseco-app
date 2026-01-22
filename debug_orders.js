const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrders() {
    try {
        const totalOrders = await prisma.order.count();
        console.log(`Total Orders: ${totalOrders}`);

        const deliveredOrders = await prisma.order.findMany({
            where: {
                status: { in: ['ENTREGADO', 'delivered'] }
            },
            take: 5,
            select: {
                id: true,
                status: true,
                deliveredDate: true,
                createdAt: true
            }
        });

        console.log('Sample Delivered Orders (ENTREGADO):');
        console.log(deliveredOrders);

        // Check distinct statuses
        const statuses = await prisma.order.groupBy({
            by: ['status'],
            _count: {
                status: true
            }
        });
        console.log('Order Status Counts:');
        console.log(statuses);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkOrders();
