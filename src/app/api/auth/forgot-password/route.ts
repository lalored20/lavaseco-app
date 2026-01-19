
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email requerido" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Security: Do not reveal user existence
            return NextResponse.json({ message: "Si el correo existe, se envió un código." });
        }

        // Generate Code (6 digits)
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Update User
        await prisma.user.update({
            where: { email },
            data: {
                verificationCode: code,
                lastVerifSentAt: new Date(),
                verifAttempts: 0
            }
        });

        // Send Email
        await sendVerificationEmail(email, code);

        return NextResponse.json({ message: "Código enviado" });

    } catch (error: any) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
