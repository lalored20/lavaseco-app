const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log("Intentando conectar a DB...");
  const prisma = new PrismaClient();

  try {
    const count = await prisma.user.count();
    console.log("Conexión exitosa. Usuarios:", count);
  } catch (e) {
    console.error("Fallo conexión:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
