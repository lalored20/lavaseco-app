import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List recent orders
export async function GET() {
    try {
        const orders = await prisma.order.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                client: true, // Include client details
                items: true,  // Include items
            }
        });
        return NextResponse.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        return NextResponse.json({ error: "Error obteniendo órdenes" }, { status: 500 });
    }
}

// POST: Create a new order (from Gemini or Manual)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { clientId, items, status } = body;

        // Validations could go here (Brain Engine)

        const newOrder = await prisma.order.create({
            data: {
                clientId,
                status: status || 'PENDIENTE',
                total: 0, // Calculate based on items later
                items: {
                    create: items // Expects array of { description, quantity, type }
                }
            },
            include: { client: true, items: true }
        });

        return NextResponse.json(newOrder);
    } catch (error) {
        console.error("Error creating order:", error);
        return NextResponse.json({ error: "Error creando orden" }, { status: 500 });
    }
}
