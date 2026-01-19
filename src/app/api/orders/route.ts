import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

// POST: Create a new order (Supports Offline Sync with UUID)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, client, items, payment, dates } = body;

        // 1. Validate Strings/Numbers
        if (!client?.cedula || !client?.name || !items?.length) {
            return NextResponse.json({ error: "Datos incompletos (Cliente o Ítems)" }, { status: 400 });
        }

        // 2. Find or Create Client (By Cedula)
        let dbClient = await prisma.client.findUnique({
            where: { cedula: client.cedula }
        });

        if (!dbClient) {
            dbClient = await prisma.client.create({
                data: {
                    cedula: client.cedula,
                    name: client.name,
                    phone: client.phone || '',
                    address: ''
                }
            });
        } else {
            // Update phone if changed
            if (client.phone && client.phone !== dbClient.phone) {
                await prisma.client.update({
                    where: { id: dbClient.id },
                    data: { phone: client.phone }
                });
            }
        }

        // 3. Idempotency Check (If order UUID already exists, return it -> already synced)
        if (id) {
            const existingOrder = await prisma.order.findUnique({ where: { id } });
            if (existingOrder) {
                return NextResponse.json({ success: true, order: existingOrder, folio: existingOrder.ticketNumber, message: "Order already synced" });
            }
        }

        // 4. Calculate Totals
        const subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);
        const total = subtotal;

        // 5. Create Order
        const newOrder = await prisma.order.create({
            data: {
                id: id, // USE THE UUID FROM CLIENT (if provided)
                clientId: dbClient.id,
                status: 'PENDIENTE',
                location: 'RECEPCION',
                totalValue: total,
                paidAmount: payment.amount || payment.abono || 0,
                paymentStatus: (payment.status === 'CANCELADO' || payment.status === 'PAGADO') ? 'PAGADO' : (payment.status === 'ABONO' ? 'ABONO' : 'PENDIENTE'),
                createdAt: dates?.created ? new Date(dates.created) : new Date(), // Allow client timestamp
                scheduledDate: dates?.delivery ? new Date(dates.delivery) : null,

                items: {
                    create: items.map((item: any) => ({
                        // MAP 'description' from frontend to 'features' or 'notes' in DB
                        // Schema has: quantity, type, color, features, defects, notes, price
                        // We will use 'type' for the main description, or put it in notes if too long.
                        features: '',
                        type: item.description || 'PRENDA',
                        quantity: item.quantity,
                        price: item.price,
                        defects: item.notes || '',
                    }))
                }
            },
            include: {
                items: true,
                client: true
            }
        });

        // 6. Create Initial Payment Log (If there is a payment)
        // This ensures the history is complete and not just relying on the order header
        const payAmount = payment.amount || payment.abono || 0;
        if (payAmount > 0) {
            // Extract Payment Method
            let paymentMethod = body.paymentMethod || 'Efectivo';

            // Fallback: Try regex on note if explicit method not found (compatibility)
            if (!body.paymentMethod) {
                const note = body.generalNote || '';
                const match = note.match(/\[Pago Inicial: (.*?)\]/);
                if (match && match[1]) {
                    paymentMethod = match[1];
                }
            }

            try {
                await prisma.paymentLog.create({
                    data: {
                        orderId: newOrder.id,
                        amount: payAmount,
                        type: 'ABONO', // Initial payment is always considered an 'ABONO' log entry, or 'PAGO_INICIAL'
                        note: `Pago Inicial al crear orden (${paymentMethod})`
                    }
                });
            } catch (logError) {
                console.error("Failed to create initial payment log:", logError);
                // Non-critical, proceed.
            }
        }

        return NextResponse.json({ success: true, order: newOrder, folio: newOrder.ticketNumber });

    } catch (error: any) {
        console.error("❌ CRITICAL DATABASE ERROR CREATING ORDER:", JSON.stringify(error, null, 2));
        if (error.code) console.error("Prisma Error Code:", error.code);
        if (error.meta) console.error("Prisma Error Meta:", error.meta);

        return NextResponse.json({
            error: "Error interno creando la orden",
            details: error.message
        }, { status: 500 });
    }
}

// PUT: Update an existing order (Sync Updates)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, payment, dates, generalNote, client } = body; // Simplified body from offline sync

        if (!id) {
            return NextResponse.json({ error: "Falta el ID de la orden" }, { status: 400 });
        }

        const existingOrder = await prisma.order.findUnique({
            where: { id },
            include: { payments: true } // Need logs? Maybe just current total.
        });

        if (!existingOrder) {
            return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
        }

        // 1. Calculate Payment Delta (To log the new payment)
        const currentPaid = Number(existingOrder.paidAmount) || 0;
        const newPaid = Number(payment.amount) || Number(payment.abono) || 0;
        const delta = newPaid - currentPaid;

        // 2. Prepare Update Data
        const updateData: any = {
            paymentStatus: (payment.status === 'CANCELADO' || payment.status === 'PAGADO') ? 'PAGADO' : (payment.status === 'ABONO' ? 'ABONO' : 'PENDIENTE'),
            paidAmount: newPaid,
            // generalNote: generalNote // Uncomment if schema has this field
        };

        if (dates?.delivery) {
            updateData.scheduledDate = new Date(dates.delivery);
        }

        // 3. Update Client Info if needed (optional, but good for sync)
        if (client?.phone) {
            await prisma.client.update({
                where: { id: existingOrder.clientId },
                data: { phone: client.phone }
            });
        }

        // 4. Perform Transaction: Update Order + Create Log
        await prisma.$transaction(async (tx) => {
            // Update Order
            await tx.order.update({
                where: { id },
                data: updateData
            });

            // Create Payment Log if there is a positive difference
            if (delta > 0) {
                // Try to infer method from incoming data or default
                // The offline invoice object might not strictly have 'newPaymentMethod'
                // We'll use a generic Note or try to extract from body.payment.method
                const method = body.payment?.method || 'Efectivo';

                await tx.paymentLog.create({
                    data: {
                        orderId: id,
                        amount: delta,
                        type: 'ABONO',
                        note: `Abono registrado (Sync) (${method})`
                    }
                });
            }
        });

        return NextResponse.json({ success: true, message: "Orden actualizada" });

    } catch (error: any) {
        console.error("❌ ERROR UPDATING ORDER:", error);
        return NextResponse.json({ error: "Error actualizando orden", details: error.message }, { status: 500 });
    }
}
