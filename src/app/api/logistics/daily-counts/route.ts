import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { date, plantCount, homeCount, plantNotes, homeNotes } = body;

        if (!date) {
            return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });
        }

        const dateObj = new Date(`${date}T12:00:00Z`);

        // Upsert
        const record = await prisma.dailyGarmentCount.upsert({
            where: {
                date: dateObj
            },
            update: {
                plantCount: Number(plantCount || 0),
                homeCount: Number(homeCount || 0),
                plantNotes: plantNotes || undefined, // undefined prevents overwriting with null if absent (though logic might want clearing)
                homeNotes: homeNotes || undefined
            },
            create: {
                date: dateObj,
                plantCount: Number(plantCount || 0),
                homeCount: Number(homeCount || 0),
                plantNotes: plantNotes || null,
                homeNotes: homeNotes || null
            }
        });

        return NextResponse.json({ success: true, data: record });
    } catch (error: any) {
        console.error("Error saving garment count:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitStr = searchParams.get('limit');
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const mode = searchParams.get('mode');

        const limit = limitStr ? parseInt(limitStr) : 30;

        if (mode === 'summary') {
            const now = new Date();
            // Default range logic
            let start: Date, end: Date;

            if (startDateStr) {
                // Parse as local YYYY-MM-DD (midday to avoid offset issues)
                start = new Date(startDateStr + 'T12:00:00');
            } else {
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            }

            if (endDateStr) {
                end = new Date(endDateStr + 'T23:59:59.999');
            } else {
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            }

            // Adjust start to beginning of day
            start.setHours(0, 0, 0, 0);


            // 1. Fetch DailyGarmentCounts
            const counts = await prisma.dailyGarmentCount.findMany({
                where: {
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                orderBy: { date: 'asc' }
            });

            // 2. Fetch Ingress (Created Orders)
            const createdOrders = await prisma.order.findMany({
                where: {
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                },
                select: { createdAt: true }
            });

            // 3. Fetch Egress (Delivered Orders)
            const deliveredOrders = await prisma.order.findMany({
                where: {
                    deliveredDate: {
                        gte: start,
                        lte: end
                    },
                    status: { in: ['ENTREGADO', 'delivered'] }
                },
                select: { deliveredDate: true }
            });

            // Process data into daily stats
            const statsMap: Record<string, any> = {};

            // Helper to get local YYYY-MM-DD key safely
            const getKey = (d: Date) => {
                return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
            };

            // Fill from Counts
            counts.forEach(c => {
                const k = getKey(c.date);
                if (!statsMap[k]) statsMap[k] = { date: k, plant: 0, home: 0, ingress: 0, egress: 0, plantNotes: null, homeNotes: null };
                statsMap[k].plant = c.plantCount;
                statsMap[k].home = c.homeCount;
                statsMap[k].plantNotes = c.plantNotes;
                statsMap[k].homeNotes = c.homeNotes;
            });

            // Fill Ingress
            createdOrders.forEach(o => {
                const k = getKey(o.createdAt);
                if (!statsMap[k]) statsMap[k] = { date: k, plant: 0, home: 0, ingress: 0, egress: 0, plantNotes: null, homeNotes: null };
                statsMap[k].ingress += 1;
            });

            // Fill Egress
            deliveredOrders.forEach(o => {
                if (o.deliveredDate) {
                    const k = getKey(o.deliveredDate);
                    if (!statsMap[k]) statsMap[k] = { date: k, plant: 0, home: 0, ingress: 0, egress: 0, plantNotes: null, homeNotes: null };
                    statsMap[k].egress += 1;
                }
            });

            const sortedStats = Object.values(statsMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return NextResponse.json({ success: true, data: sortedStats });
        }

        // Default: History Listing
        const records = await prisma.dailyGarmentCount.findMany({
            orderBy: { date: 'desc' },
            take: limit
        });

        return NextResponse.json({ success: true, data: records });
    } catch (error: any) {
        console.error("Error fetching garment counts:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
