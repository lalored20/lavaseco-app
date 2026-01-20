import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { targetNumber } = await req.json();

        if (!targetNumber || typeof targetNumber !== 'number') {
            return NextResponse.json({ error: "Número objetivo requerido (targetNumber: number)" }, { status: 400 });
        }

        // DANGEROUS: Alter database sequence
        // Note: The sequence name for Prisma defaults usually follows "Model_field_seq"
        // For Order model ticketNumber: "Order_ticketNumber_seq"
        const seqName = 'Order_ticketNumber_seq';

        // PostgreSQL syntax
        const query = `ALTER SEQUENCE "${seqName}" RESTART WITH ${targetNumber};`;

        await prisma.$executeRawUnsafe(query);

        return NextResponse.json({
            success: true,
            message: `Secuencia reiniciada a ${targetNumber}`,
            details: `Query executed: ${query}`
        });

    } catch (error: any) {
        console.error("Sequence Reset Error:", error);
        return NextResponse.json({ error: "Error reiniciando secuencia", details: error.message }, { status: 500 });
    }
}
