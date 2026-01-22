const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log("Applying manual migration...");
    const prisma = new PrismaClient();

    try {
        // 1. Create Enums (Idempotent approach)
        try {
            await prisma.$executeRawUnsafe(`CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');`);
            console.log("✅ Enum Role created");
        } catch (e) {
            console.log("⚠️ Enum Role might already exist or failed:", e.message.split('\n')[0]);
        }

        try {
            await prisma.$executeRawUnsafe(`CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');`);
            console.log("✅ Enum ShiftStatus created");
        } catch (e) {
            console.log("⚠️ Enum ShiftStatus might already exist:", e.message.split('\n')[0]);
        }

        // 2. Add columns to User
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "name" TEXT;`);
            console.log("✅ User.name added");
        } catch (e) { console.log("⚠️ User.name skipped:", e.message.split('\n')[0]); }

        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'STAFF';`);
            console.log("✅ User.role added");
        } catch (e) { console.log("⚠️ User.role skipped:", e.message.split('\n')[0]); }

        // 3. Add columns to CashShift
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "CashShift" ADD COLUMN "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN';`);
            console.log("✅ CashShift.status added");
        } catch (e) { console.log("⚠️ CashShift.status skipped:", e.message.split('\n')[0]); }

        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "CashShift" ADD COLUMN "userId" TEXT;`);
            console.log("✅ CashShift.userId added");
        } catch (e) { console.log("⚠️ CashShift.userId skipped:", e.message.split('\n')[0]); }

        // 4. Add FK
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
            console.log("✅ CashShift FK added");
        } catch (e) { console.log("⚠️ CashShift FK skipped:", e.message.split('\n')[0]); }

        // 5. Create DailyGarmentCount Table
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "DailyGarmentCount" (
                    "id" TEXT NOT NULL,
                    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "plantCount" INTEGER NOT NULL DEFAULT 0,
                    "homeCount" INTEGER NOT NULL DEFAULT 0,
                    "updatedAt" TIMESTAMP(3) NOT NULL,

                    CONSTRAINT "DailyGarmentCount_pkey" PRIMARY KEY ("id")
                );
            `);
            console.log("✅ Table DailyGarmentCount created");
        } catch (e) { console.log("⚠️ Table DailyGarmentCount skipped/failed:", e.message.split('\n')[0]); }

        try {
            await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "DailyGarmentCount_date_key" ON "DailyGarmentCount"("date");`);
            console.log("✅ Index DailyGarmentCount_date_key created");
        } catch (e) { console.log("⚠️ Index DailyGarmentCount_date_key skipped:", e.message.split('\n')[0]); }

        console.log("🏁 Migration attempts finished.");

    } catch (e) {
        console.error("❌ Fatal Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
