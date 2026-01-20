
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const { email, code } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.verificationCode !== code) {
        return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
    }


    // DETERMINE ROLE
    const SUPER_ADMINS = ['rutaexitosa2@gmail.com', 'rmendivilmora2@gmail.com'];
    let role: 'ADMIN' | 'STAFF' = 'STAFF';

    if (SUPER_ADMINS.includes(email)) {
        role = 'ADMIN';
    } else {
        const allowed = await prisma.allowedAdmin.findUnique({ where: { email } });
        if (allowed) {
            role = 'ADMIN';
        }
    }

    // Mark as verified AND Update Role
    await prisma.user.update({
        where: { email },
        data: {
            isVerified: true,
            verificationCode: null, // Clear Code
            verifAttempts: 0,
            role: role // DYNAMIC ROLE ASSIGNMENT
        }
    });

    return NextResponse.json({ status: 'SUCCESS', message: "Identidad verificada correctamente." });
}
