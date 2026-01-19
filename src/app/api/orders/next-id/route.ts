import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const lastOrder = await prisma.order.findFirst({
            orderBy: { id: 'desc' },
            select: { id: true }
        });

        // const nextId = (lastOrder?.id || 0) + 1;
        const nextId = "UUID-GEN";

        return NextResponse.json({ nextId });
    } catch (error) {
        console.error("Error fetching next ID:", error);
        return NextResponse.json({ error: "Error obteniendo siguiente ID" }, { status: 500 });
    }
}
