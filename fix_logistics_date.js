const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log("Starting fix...");

    // 1. Delete the incorrect "future/offset" record (Jan 21 UTC Midnight -> Jan 20 Bogota)
    // ID from previous inspection: b6b882e8-84df-4478-9775-5e6a135a84f3
    const deleted = await prisma.dailyGarmentCount.deleteMany({
        where: {
            id: 'b6b882e8-84df-4478-9775-5e6a135a84f3'
        }
    });
    console.log(`Deleted ${deleted.count} incorrect records.`);

    // 2. Fix the correct record (Jan 20 UTC Midnight -> Jan 19 Bogota) to be Jan 20 UTC Noon
    // ID from previous inspection: 3f21e584-12ba-4038-9215-3e03c9249ff3
    const updated = await prisma.dailyGarmentCount.update({
        where: {
            id: '3f21e584-12ba-4038-9215-3e03c9249ff3'
        },
        data: {
            date: new Date('2026-01-20T12:00:00Z')
        }
    });
    console.log("Updated record:", updated);
}

fix()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
