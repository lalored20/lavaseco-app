
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendVerificationEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // SCENARIO 1: NEW USER (First time)
        if (!user) {
            const code = generateCode();
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create unverified user
            await prisma.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    isVerified: false,
                    verificationCode: code,
                    lastVerifSentAt: new Date(),
                    verifAttempts: 1,
                }
            });

            // Send Email (Try/Catch wrapper to allow login even if email fails in DEV)
            let sent = false;
            try {
                sent = await sendVerificationEmail(email, code);
            } catch (e) {
                console.error("Email fail", e);
            }

            // DEBUG MODE: Return code in message if email fails or always for now to unblock user
            const debugMsg = sent ? "Código enviado a tu correo." : `(DEBUG) Google bloqueó el correo. Tu código es: ${code}`;

            return NextResponse.json({
                status: 'VERIFY_NEEDED',
                message: debugMsg
            });
        }

        // SCENARIO 2: EXISTING USER
        // Check Password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
        }

        // Check if verified
        if (!user.isVerified) {
            // Resend code if needed? Or just ask for the old one? 
            // Logic: Generate new code if it's been a while, or just tell them to verify.
            // For simplicity: Generate new code and send
            const code = generateCode();
            await prisma.user.update({
                where: { email },
                data: { verificationCode: code, lastVerifSentAt: new Date() }
            });
            let sent = false;
            try {
                sent = await sendVerificationEmail(email, code);
            } catch (e) {
                console.error("Email fail", e);
            }

            const debugMsg = sent ? "Cuenta no verificada. Código enviado." : `(DEBUG) Código: ${code}`;

            return NextResponse.json({
                status: 'VERIFY_NEEDED',
                message: debugMsg
            });
        }

        // Success
        return NextResponse.json({
            status: 'SUCCESS',
            message: "Bienvenido de nuevo.",
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
    }
}
