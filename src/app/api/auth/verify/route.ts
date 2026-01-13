
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    const { email, code } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.verificationCode !== code) {
        return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
    }

    // Mark as verified
    await prisma.user.update({
        where: { email },
        data: {
            isVerified: true,
            verificationCode: null, // Clear Code
            verifAttempts: 0
        }
    });

    return NextResponse.json({ status: 'SUCCESS', message: "Identidad verificada correctamente." });
}
