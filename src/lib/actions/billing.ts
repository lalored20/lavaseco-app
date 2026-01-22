"use server";

import { prisma } from "../prisma";
import { revalidatePath } from "next/cache";

export async function getNextFolio() {
    try {
        const lastOrder = await prisma.order.findFirst({
            orderBy: { ticketNumber: 'desc' },
            select: { ticketNumber: true }
        });
        // Return the next sequential number based on ticketNumber
        return { nextId: (lastOrder?.ticketNumber || 0) + 1 };
    } catch (error) {
        console.error("Error fetching next folio:", error);
        return { nextId: 0 }; // Return 0 to trigger "AUTO" in UI on error
    }
}

export async function createInvoice(data: {
    client: { cedula: string; name: string; phone?: string };
    items: { description: string; quantity: number; price: number; notes?: string }[];
    payment: { status: string; abono?: number; total: number; method?: string };
    deliveryDate?: string; // Optional delivery date
}) {
    try {
        const { client, items, payment, deliveryDate } = data;

        // 1. Find or Create Client
        let dbClient = await prisma.client.findFirst({
            where: { id: client.cedula } // Assuming cedula is used as ID or we search by it. 
            // Wait, schema says Client.id is String @id @default(cuid()).
            // We should probably search by a unique field if available, but 'cedula' isn't in the schema you showed.
            // The schema showed: id, name, phone, address.
            // Let's assume we treat 'id' as the cedula for simplicity if it's a string, or we just create a new one if not found by name?
            // Best approach given schema: Use the `cedula` input as the `id` if possible, or search by name.
            // However, usually ID is internal CUID. Let's check if we can store cedula.
            // Schema doesn't have 'cedula'. I will assume 'id' can store the cedula provided by user if we force it, 
            // or we just create a client. 
            // LET'S ADAPT: We will try to find client by Name for now, or just create new.
            // Update: The form asks for Cedula. I will use the Cedula as the ID for the client to ensure uniqueness easily.
        });

        if (!dbClient) {
            // Try to find by ID (Cedula)
            dbClient = await prisma.client.findUnique({
                where: { id: client.cedula }
            });
        }

        if (!dbClient) {
            dbClient = await prisma.client.create({
                data: {
                    id: client.cedula, // Use Cedula as ID
                    name: client.name,
                    phone: client.phone,
                }
            });
        } else {
            // Update info if needed
            await prisma.client.update({
                where: { id: client.cedula },
                data: {
                    name: client.name,
                    phone: client.phone
                }
            })
        }

        // 2. Create Order
        const newOrder = await prisma.order.create({
            data: {
                clientId: dbClient.id,
                totalValue: payment.total,
                paidAmount: payment.abono || 0,
                paymentStatus: payment.status || "PENDIENTE",
                status: "PENDIENTE",
                location: "RECEPCION",
                scheduledDate: deliveryDate ? new Date(deliveryDate) : undefined, // Set scheduled date
                items: {
                    create: items.map(item => ({
                        type: item.description, // Mapped from description to type
                        quantity: item.quantity,
                        price: item.price,
                        notes: item.notes,
                        // features, color, defects left empty or mapped if needed
                    }))
                },
                payments: {
                    create: (payment.abono && payment.abono > 0) ? [{
                        amount: payment.abono,
                        type: 'ABONO_INICIAL',
                        note: `Abono inicial (${payment.method || 'Efectivo'})`
                    }] : []
                }
            }
        });

        revalidatePath("/dashboard/billing-a");
        revalidatePath("/dashboard/billing-a/list");
        return { success: true, orderId: newOrder.id };

    } catch (error: any) {
        console.error("Error creating invoice:", error);
        return { success: false, error: `Error DB: ${error.message}` };
    }
}

export async function getInvoices(limit = 1000) {
    try {
        const orders = await prisma.order.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                client: true,
                items: true,
                payments: {
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: { items: true }
                }
            }
        });
        return { success: true, data: orders };
    } catch (error) {
        return { success: false, error: `Error detalle: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function getInvoiceById(orderId: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                client: true,
                items: true,
                payments: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!order) {
            return { success: false, error: 'Orden no encontrada' };
        }

        return { success: true, data: order };
    } catch (error) {
        return { success: false, error: `Error al cargar factura: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function registerPayment(orderId: string, amount: number, paymentMethod: string = 'Efectivo') {
    console.log(`[Server Action] registering payment for order ${orderId}, amount: ${amount}`);
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            console.error(`[Server Action] Order ${orderId} not found`);
            return { success: false, error: "Orden no encontrada" };
        }

        const newPaidAmount = (order.paidAmount || 0) + amount;
        const total = order.totalValue || 0;

        let newStatus = 'PENDIENTE';
        let paymentType = 'ABONO';

        if (newPaidAmount >= total && total > 0) {
            newStatus = 'PAGADO';
            if (newPaidAmount >= total) newStatus = 'CANCELADO';

            // Check if it's a full payment at once or closing balance?
            // If amount == total, it's full payment.
            // If newPaidAmount == total but amount < total, it's closing balance.
            paymentType = 'CANCELACION';
        } else if (newPaidAmount > 0) {
            newStatus = 'ABONO';
        }

        console.log(`[Server Action] New status: ${newStatus}, New paid amount: ${newPaidAmount}`);

        // 2. Update Order AND Create Log Transaction
        await prisma.$transaction([
            prisma.order.update({
                where: { id: orderId },
                data: {
                    paidAmount: newPaidAmount,
                    paymentStatus: newStatus
                }
            }),
            prisma.paymentLog.create({
                data: {
                    orderId: orderId,
                    amount: amount,
                    type: paymentType,
                    note: `Abono registrado (${paymentMethod})` // Clean note with Method for badge parsing
                }
            })
        ]);

        // console.log(`[Server Action] Payment updated in DB. Revalidating path...`);

        // revalidatePath("/dashboard/billing-a/list"); 

        console.log(`[Server Action] Done.`);
        return { success: true };

    } catch (error: any) {
        console.error("Error registering payment:", error);
        return { success: false, error: "Error al registrar el pago" };
    }
}

// --- NEW: Server-Side Search ---
// --- NEW: Server-Side Search (Smart) ---
export async function searchInvoices(
    query: string = '',
    page: number = 1,
    limit: number = 50,
    filters: {
        startDate?: Date | string; // Allow string for serialization
        endDate?: Date | string;
        name?: string;
        cedula?: string;
        phone?: string;
        description?: string;
        ticketNumber?: string; // NEW field
    } = {}
) {
    try {
        const skip = (page - 1) * limit;
        const term = query.trim();

        // Build Filter
        let whereClause: any = { AND: [] }; // Use AND array for combining logical blocks

        // --- 1. General Search (Smart Bar) ---
        // Keeps existing logic, but adds to the AND array
        // 0. Detect Date Patterns (Prioritize Dates)
        // Matches: "14 de enero", "14 de enero 2025", "14/01", "14-01", "14/01/2025"
        let dateFilter: any = null;

        // Only run smart date/term logic if query exists
        if (term) {
            // ... existing regex logic ...
            // Regex 1: "DD de Month [YYYY]"
            const naturalDateMatch = term.match(/(\d{1,2})\s+de\s+([a-záéíóú]+(?:\s+de)?)(?:\s+(\d{4}))?/i);
            // Regex 2: "DD/MM/[YYYY]" or "DD-MM-[YYYY]"
            const numericDateMatch = term.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);

            if (naturalDateMatch) {
                const day = parseInt(naturalDateMatch[1]);
                const monthName = naturalDateMatch[2].toLowerCase();
                const yearStr = naturalDateMatch[3];

                const months: { [key: string]: number } = {
                    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
                    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
                };

                if (months[monthName] !== undefined) {
                    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
                    const startDate = new Date(year, months[monthName], day, 0, 0, 0);
                    const endDate = new Date(year, months[monthName], day, 23, 59, 59);
                    dateFilter = {
                        createdAt: { gte: startDate, lte: endDate }
                    };
                }
            } else if (numericDateMatch) {
                const day = parseInt(numericDateMatch[1]);
                const month = parseInt(numericDateMatch[2]) - 1; // JS months are 0-indexed
                const yearStr = numericDateMatch[3];

                if (month >= 0 && month <= 11) {
                    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
                    const startDate = new Date(year, month, day, 0, 0, 0);
                    const endDate = new Date(year, month, day, 23, 59, 59);
                    dateFilter = {
                        createdAt: { gte: startDate, lte: endDate }
                    };
                }
            }

            if (dateFilter) {
                whereClause.AND.push(dateFilter);
            } else {
                const isNumeric = /^\d+$/.test(term);
                const subConditions: any[] = []; // OR logic for general terms

                if (isNumeric) {
                    const val = parseInt(term);
                    // 1. Strict Ticket Priority
                    subConditions.push({ ticketNumber: val });

                    // 2. Phone/Cedula: Only if length >= 5
                    if (term.length >= 5) {
                        subConditions.push({ client: { cedula: { contains: term } } });
                        subConditions.push({ client: { phone: { contains: term } } });
                    }
                } else {
                    // Text Search
                    subConditions.push({ client: { name: { contains: term, mode: 'insensitive' } } });
                    subConditions.push({ items: { some: { type: { contains: term, mode: 'insensitive' } } } });
                }

                if (subConditions.length > 0) {
                    whereClause.AND.push({ OR: subConditions });
                }
            }
        }

        // --- 2. Explicit Filters (Panel) ---
        if (filters.name) {
            whereClause.AND.push({ client: { name: { contains: filters.name, mode: 'insensitive' } } });
        }
        if (filters.cedula) {
            whereClause.AND.push({ client: { cedula: { contains: filters.cedula } } });
        }
        if (filters.phone) {
            whereClause.AND.push({ client: { phone: { contains: filters.phone } } });
        }
        if (filters.description) {
            whereClause.AND.push({ items: { some: { type: { contains: filters.description, mode: 'insensitive' } } } });
        }
        if (filters.ticketNumber) {
            // Strict match for ticket number in filters
            const val = parseInt(filters.ticketNumber);
            if (!isNaN(val)) {
                whereClause.AND.push({ ticketNumber: val });
            }
        }
        if (filters.startDate || filters.endDate) {
            const start = filters.startDate ? new Date(filters.startDate) : undefined;
            const end = filters.endDate ? new Date(filters.endDate) : undefined;

            if (end) end.setHours(23, 59, 59, 999); // End of day

            const dateRange: any = {};
            if (start) dateRange.gte = start;
            if (end) dateRange.lte = end;

            whereClause.AND.push({ createdAt: dateRange });
        }

        // Clean up empty AND
        if (whereClause.AND.length === 0) {
            whereClause = {};
        }

        // Get Data
        const [orders, totalCount] = await prisma.$transaction([
            prisma.order.findMany({
                where: whereClause,
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    client: true,
                    items: true,
                    payments: { orderBy: { createdAt: 'desc' } },
                    _count: { select: { items: true } }
                }
            }),
            prisma.order.count({ where: whereClause })
        ]);

        return {
            success: true,
            data: orders,
            pagination: {
                total: totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit)
            }
        };

    } catch (error) {
        console.error("Error searching invoices:", error);
        return { success: false, error: "Error en búsqueda." };
    }
}

export async function getAllPendingInvoices() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                OR: [
                    { status: 'PENDIENTE' },
                    { status: 'PROBLEMA' }, // For missing items
                    { status: 'EN_PROCESO' }, // For organized items ready for delivery
                    { status: 'delivered' } // For delivered history items
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                client: true,
                items: true,
                // Include both potential sources of payment info
                payments: {
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: { items: true }
                }
            }
        });
        return { success: true, data: orders };
    } catch (error) {
        console.error("Error getting pending invoices:", error);
        return { success: false, error: "Error loading pending invoices." };
    }
}

export async function updateLogisticsStatus(orderId: string, action: 'organize' | 'missing' | 'found') {
    try {
        let updateData: any = {};

        if (action === 'organize') {
            updateData = {
                status: 'EN_PROCESO', // Moves out of Pendiente
                location: 'PLANTA'
            };
        } else if (action === 'missing') {
            updateData = {
                status: 'PROBLEMA',
                location: 'RECEPCION' // stays in reception but flagged
            };
        } else if (action === 'found') {
            updateData = {
                status: 'EN_PROCESO', // Recovered -> Process
                location: 'PLANTA'
            };
        }

        await prisma.order.update({
            where: { id: orderId },
            data: updateData
        });

        revalidatePath("/dashboard/logistics/organize");
        revalidatePath("/dashboard/logistics/missing");
        revalidatePath("/dashboard/billing-a/list");

        return { success: true };
    } catch (error) {
        console.error("Error updating logistics status:", error);
        return { success: false, error: "Failed to update status" };
    }
}

export async function deliverOrder(orderId: string) {
    try {
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'delivered',
                deliveredDate: new Date(),
            }
        });

        revalidatePath("/dashboard/delivery");
        revalidatePath("/dashboard/billing-a/list");
        return { success: true };
    } catch (error) {
        console.error("Error delivering order:", error);
        return { success: false, error: "Failed to deliver order" };
        return { success: false, error: "Failed to deliver order" };
    }
}

export async function cancelOrder(orderId: string) {
    try {
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'CANCELADO',
                paymentStatus: 'CANCELADO', // Ensure payment status also reflects this
                location: 'CANCELADO' // Optional: Move to a logical "bin"
            }
        });

        // Revalidate ALL paths to ensure it disappears/updates everywhere
        revalidatePath("/dashboard/billing-a/list");
        revalidatePath("/dashboard/logistics/organize");
        revalidatePath("/dashboard/logistics/missing");
        revalidatePath("/dashboard/delivery");
        revalidatePath("/dashboard/cash");

        return { success: true };
    } catch (error) {
        console.error("Error cancelling order:", error);
        return { success: false, error: "Failed to cancel order" };
    }
}

export async function getDailyCashSummary(
    startDateStr?: string,
    endDateStr?: string,
    optionsOrIgnoreShifts: boolean | { ignoreShifts?: boolean, useExactTimes?: boolean } = false
) {
    try {
        const options = typeof optionsOrIgnoreShifts === 'object'
            ? optionsOrIgnoreShifts
            : { ignoreShifts: optionsOrIgnoreShifts, useExactTimes: false };

        const { ignoreShifts, useExactTimes } = options;

        const start = startDateStr ? new Date(startDateStr) : new Date();
        if (!useExactTimes) start.setHours(0, 0, 0, 0);

        const end = endDateStr ? new Date(endDateStr) : new Date(start);
        if (!useExactTimes) end.setHours(23, 59, 59, 999);

        // --- SHIFT LOGIC START ---
        // Need day boundaries for fetching ALL shifts of the day metadata
        const dayStart = new Date(start);
        if (useExactTimes) dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        // @ts-ignore
        const shifts = await prisma.cashShift.findMany({
            where: {
                createdAt: { gte: dayStart, lte: dayEnd }
            },
            orderBy: { turnNumber: 'asc' }
        });

        const lastShift = shifts.length > 0 ? shifts[shifts.length - 1] : null;
        const currentTurnNumber = (lastShift?.turnNumber || 0) + 1;

        // If filtering a single day, respect shifts. If range, show all.
        const isSingleDay = start.toDateString() === end.toDateString();

        // LOGIC CHANGE: If ignoreShifts is true, we fetch from start of day (00:00).
        // Otherwise, we fetch from the end of the last shift (current active shift).
        let fetchStart = start;
        let fetchEnd = end;

        if (!useExactTimes) {
            if (isSingleDay && !ignoreShifts && lastShift) {
                fetchStart = lastShift.endTime;
            }
        }
        // --- SHIFT LOGIC END ---

        const logs = await prisma.paymentLog.findMany({
            where: {
                createdAt: {
                    gte: fetchStart,
                    lte: fetchEnd
                }
            },
            include: {
                order: {
                    select: {
                        ticketNumber: true,
                        status: true,
                        paymentStatus: true,
                        totalValue: true,
                        paidAmount: true,
                        client: { select: { name: true, cedula: true, phone: true } },
                        items: { select: { type: true, color: true, features: true, quantity: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });


        // Fetch Expenses (Safely)
        let expenses: any[] = [];
        try {
            // @ts-ignore: Prisma model might not be generated yet
            if (prisma.expense) {
                // @ts-ignore
                expenses = await prisma.expense.findMany({
                    where: {
                        date: {
                            gte: fetchStart,
                            lte: fetchEnd
                        }
                    },
                    orderBy: { date: 'desc' }
                });
            }
        } catch (e) {
            console.warn("Expense model not ready:", e);
        }

        // Calculate Totals
        let totalCash = 0;
        let totalDigital = 0;
        const methodsSummary: Record<string, { count: number; total: number }> = {};

        const enrichedLogs = logs.map(log => {
            const methodMatch = log.note?.match(/\((.*?)\)/);
            const method = methodMatch ? methodMatch[1] : 'Desconocido';

            if (method === 'Efectivo') {
                totalCash += log.amount;
            } else {
                totalDigital += log.amount;
            }

            if (!methodsSummary[method]) {
                methodsSummary[method] = { count: 0, total: 0 };
            }
            methodsSummary[method].count += 1;
            methodsSummary[method].total += log.amount;

            // Simplify Items Description
            // @ts-ignore
            const items = log.order?.items || [];

            // @ts-ignore
            const itemsDesc = items.length > 0
                // @ts-ignore 
                ? items.map(i => [i.quantity + 'x', i.type, i.color, i.features].filter(Boolean).join(' ')).join(', ')
                : 'Sin detalles';
            // @ts-ignore
            const itemsCount = items.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0;

            // Determine Payment Status
            // @ts-ignore
            const paymentStatus = log.order?.paymentStatus || 'PENDIENTE';
            // @ts-ignore
            const totalValue = log.order?.totalValue || 0;
            // @ts-ignore
            const paidAmount = log.order?.paidAmount || 0;

            const isFullyPaid = paymentStatus === 'PAGADO' || (paidAmount >= totalValue && totalValue > 0);
            // @ts-ignore
            const orderStatus = log.order?.status || 'pending';

            return {
                id: log.id,
                orderId: log.orderId, // Return orderId for frontend navigation
                amount: log.amount,
                method,
                type: 'income',
                date: log.createdAt,
                clientName: log.order?.client?.name || 'Cliente Casual',
                ticketNumber: log.order?.ticketNumber || '---',
                clientCedula: log.order?.client?.cedula || '',
                clientPhone: log.order?.client?.phone || '',
                itemsDescription: itemsDesc,
                itemsCount: itemsCount > 0 ? itemsCount : 1,
                isPaid: isFullyPaid,
                orderStatus: orderStatus
            };
        });

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        return {
            success: true,
            data: {
                startDate: fetchStart.toISOString(),
                endDate: fetchEnd.toISOString(),
                totalCash,
                totalDigital,
                totalCollected: totalCash + totalDigital,
                totalExpenses,
                netCash: totalCash - totalExpenses,
                digitalBreakdown: methodsSummary, // Match frontend expectation
                transactions: enrichedLogs,
                expenses, // Include raw expenses
                turnNumber: currentTurnNumber,
                previousShifts: shifts.map((s: any) => ({
                    ...s,
                    date: s.date.toISOString(),
                    startTime: s.startTime.toISOString(),
                    endTime: s.endTime.toISOString(),
                    createdAt: s.createdAt.toISOString()
                }))
            }
        };

    } catch (error) {
        console.error("Error fetching daily summary:", error);
        return { success: false, error: `Error detalle: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function registerExpense(data: { description: string; amount: number; category?: string; date?: Date }) {
    try {
        // @ts-ignore
        const expense = await prisma.expense.create({
            data: {
                description: data.description,
                amount: data.amount,
                category: data.category,
                date: data.date || new Date()
            }
        });

        revalidatePath('/dashboard/cash');
        return { success: true, data: expense };
    } catch (error) {
        console.error("Error creating expense:", error);
        return { success: false, error: `Error detalle: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function deleteExpense(id: string) {
    try {
        const expense = await prisma.expense.delete({
            where: { id }
        });
        revalidatePath('/dashboard/cash');
        return { success: true };
    } catch (error) {
        console.error("Error deleting expense:", error);
        return { success: false, error: "No se pudo eliminar el gasto." };
    }
}

export async function closeCashShift(data: {
    turnNumber: number;
    cashCount: number;
    digitalCount: number;
    expenseCount: number;
    totalCalculated: number;
}) {
    try {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        // @ts-ignore
        const lastShift = await prisma.cashShift.findFirst({
            orderBy: { createdAt: 'desc' }, // Get the absolute last shift, regardless of date
        });

        // Determine next Turn Number
        let nextTurnNumber = 1;

        if (lastShift) {
            const lastShiftDate = new Date(lastShift.createdAt); // Shift creation date
            // const timeDiff = now.getTime() - lastShiftDate.getTime();

            // Check if it's the same day (Local/Server time)
            // Note: This relies on the server's timezone. 
            // Ideally should match user timezone, but for now server time is the source of truth.
            const isSameDay =
                lastShiftDate.getDate() === now.getDate() &&
                lastShiftDate.getMonth() === now.getMonth() &&
                lastShiftDate.getFullYear() === now.getFullYear();

            if (isSameDay) {
                nextTurnNumber = (lastShift.turnNumber || 0) + 1;
            } else {
                nextTurnNumber = 1; // RESET FOR NEW DAY
            }
        }

        const startTime = lastShift && nextTurnNumber > 1 ? lastShift.endTime : startOfDay;


        // @ts-ignore
        const newShift = await prisma.cashShift.create({
            data: {
                date: now,
                date: now,
                startTime: startTime,
                endTime: now,
                turnNumber: nextTurnNumber, // Use Server Calculated Number
                cashCount: data.cashCount,
                digitalCount: data.digitalCount,
                expenseCount: data.expenseCount,
                totalCalculated: data.totalCalculated
            }
        });

        revalidatePath('/dashboard/cash');
        return { success: true, data: newShift };
    } catch (error) {
        console.error("Error closing shift:", error);
        return { success: false, error: "Error al cerrar el turno." };
    }
}

// --- RECOVERY / SYNC ACTIONS ---
export async function upsertInvoicesBulk(invoices: any[]) {
    console.log(`[Sync] Received ${invoices.length} invoices to sync.`);
    try {
        let successCount = 0;
        let errorCount = 0;

        for (const invoice of invoices) {
            try {
                // 1. Upsert Client
                const clientId = invoice.client.id || invoice.client.cedula || 'UNKNOWN_' + Date.now();

                // Ensure Client Exists
                const clientData = {
                    id: clientId,
                    name: invoice.client.name || 'Cliente Sin Nombre',
                    cedula: invoice.client.cedula,
                    phone: invoice.client.phone,
                };

                await prisma.client.upsert({
                    where: { id: clientId },
                    update: clientData,
                    create: clientData
                });

                // 2. Upsert Order
                const existingOrder = await prisma.order.findUnique({ where: { id: invoice.id } });

                const orderData = {
                    id: invoice.id,
                    ticketNumber: invoice.ticketNumber || undefined, // Allow default generation if missing, but usually ideally preserved
                    clientId: clientId,
                    totalValue: invoice.totalValue,
                    paidAmount: invoice.payment?.amount || 0,
                    paymentStatus: invoice.payment?.status || 'PENDIENTE',
                    status: invoice.orderStatus || invoice.status || 'PENDIENTE', // Careful with 'SYNCED' status from local
                    createdAt: new Date(invoice.createdAt), // Restore original date
                    // If local has dates.delivery use it, otherwise undefined
                    scheduledDate: invoice.dates?.delivery ? new Date(invoice.dates.delivery) : undefined,
                    // FIX: Ensure deliveredDate is synced if present (mapped from deliveryDate or deliveredDate)
                    deliveredDate: invoice.deliveryDate ? new Date(invoice.deliveryDate) : (invoice.deliveredDate ? new Date(invoice.deliveredDate) : undefined)
                };

                if (existingOrder) {
                    await prisma.order.update({
                        where: { id: invoice.id },
                        data: {
                            ...orderData,
                            ticketNumber: undefined, // Don't change ticket number on update usually
                            createdAt: undefined // Don't change creation date
                        }
                    });
                } else {
                    await prisma.order.create({
                        data: {
                            ...orderData,
                            items: {
                                create: invoice.items.map((item: any) => ({
                                    type: item.type || item.description || 'Prenda',
                                    quantity: item.quantity || 1,
                                    price: item.price || 0,
                                    color: item.color,
                                    features: item.features,
                                    notes: item.notes
                                }))
                            }
                        }
                    });
                }

                // 3. Sync Payment Logs (If paid and no logs exist)
                if (orderData.paidAmount > 0) {
                    const logs = await prisma.paymentLog.count({ where: { orderId: invoice.id } });
                    if (logs === 0) {
                        // Create a recovery log
                        await prisma.paymentLog.create({
                            data: {
                                orderId: invoice.id,
                                amount: orderData.paidAmount,
                                type: 'ABONO', // Assume Abono for recovery
                                note: 'Recuperado de Local (Sincronización)',
                                createdAt: new Date(invoice.createdAt) // Backdate it
                            }
                        });
                    }
                }

                successCount++;

            } catch (innerError) {
                console.error(`[Sync] Error syncing invoice ${invoice.id}:`, innerError);
                errorCount++;
            }
        }

        revalidatePath('/dashboard/billing-a/list');
        revalidatePath('/dashboard/cash');
        return { success: true, count: successCount, errors: errorCount };

    } catch (error) {
        console.error("Error bulk syncing:", error);
        return { success: false, error: "Error de sincronización masiva." };
    }
}
