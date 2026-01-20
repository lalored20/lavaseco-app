const { Client } = require('pg');
require('dotenv').config();

// Fix for strict certification on some dev envs
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const schema = `
-- Drop Everything (Dangerous but necessary for a reset if state is unknown)
DROP TABLE IF EXISTS "PaymentLog" CASCADE;
DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "Expense" CASCADE;
DROP TABLE IF EXISTS "Client" CASCADE;
DROP TABLE IF EXISTS "CashShift" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "ShiftStatus" CASCADE;

-- Create Enum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'STAFF',
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "verificationCode" TEXT,
  "verifAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastVerifSentAt" TIMESTAMP(3),
  "lockoutUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Client" (
  "id" TEXT NOT NULL,
  "cedula" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Client_cedula_key" ON "Client"("cedula");

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "category" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorizedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "ticketNumber" SERIAL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledDate" TIMESTAMP(3),
  "deliveredDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "location" TEXT NOT NULL DEFAULT 'RECEPCION',
  "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "clientId" TEXT NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "type" TEXT NOT NULL,
  "color" TEXT,
  "features" TEXT,
  "defects" TEXT,
  "notes" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentLog" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'ABONO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashShift" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3),
  "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
  "userId" TEXT,
  "turnNumber" INTEGER NOT NULL DEFAULT 1,
  "cashCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "digitalCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expenseCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCalculated" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "closedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashShift_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
`;

async function main() {
    try {
        console.log("Connecting...");
        await client.connect();
        console.log("Connected. Applying Schema...");
        await client.query(schema);
        console.log("✅ Schema successfully applied!");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.end();
    }
}

main();
