
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { email, code, newPassword } = await request.json();

        if (!email || !code || !newPassword) {
            return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        if (user.verificationCode !== code) {
            return NextResponse.json({ error: "Código inválido" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update Password & Clear Code
        await prisma.user.update({
            where: { email },
            data: {
                passwordHash: hashedPassword,
                verificationCode: null, // Invalidate code
                verifAttempts: 0
            }
        });

        return NextResponse.json({ message: "Contraseña actualizada" });

    } catch (error: any) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ error: "Error actualizando contraseña" }, { status: 500 });
    }
}
