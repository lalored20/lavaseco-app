
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Adjust import path if needed

export async function GET() {
    try {
        const orderCount = await prisma.order.count();
        const paymentLogCount = await prisma.paymentLog.count();

        // Check for orders with paid amount > 0
        const paidOrdersCount = await prisma.order.count({
            where: { paidAmount: { gt: 0 } }
        });

        // Get a sample of latest logs
        const logs = await prisma.paymentLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { order: { select: { ticketNumber: true } } }
        });

        // Get sample of recent paid orders
        const orders = await prisma.order.findMany({
            take: 5,
            where: { paidAmount: { gt: 0 } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            status: 'DEBUG',
            counts: {
                totalOrders: orderCount,
                totalPaymentLogs: paymentLogCount,
                ordersWithPayment: paidOrdersCount
            },
            sampleLogs: logs,
            samplePaidOrders: orders
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
