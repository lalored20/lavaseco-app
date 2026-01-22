
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
    const { email } = await req.json();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // CHECK LOCKOUT
    if (user.lockoutUntil && new Date() < user.lockoutUntil) {
        const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - new Date().getTime()) / 60000);
        return NextResponse.json({ error: `Demasiados intentos. Espera ${minutesLeft} minutos.` }, { status: 429 });
    }

    // CHECK ATTEMPTS
    if (user.verifAttempts >= 3) {
        // Lockout for 15 mins
        const lockoutTime = new Date(new Date().getTime() + 15 * 60000);
        await prisma.user.update({
            where: { email },
            data: {
                lockoutUntil: lockoutTime,
                verifAttempts: 0 // Reset attempts after lockout set? Or keep them? Usually reset but enforce lockout.
            }
        });
        return NextResponse.json({ error: "Has excedido el límite de intentos. Espera 15 minutos." }, { status: 429 });
    }

    // SEND NEW CODE
    const code = generateCode();

    // Update attempts + 1
    await prisma.user.update({
        where: { email },
        data: {
            verificationCode: code,
            lastVerifSentAt: new Date(),
            verifAttempts: { increment: 1 }
        }
    });

    let sent = false;
    try {
        sent = await sendVerificationEmail(email, code);
    } catch (e) { console.error(e) }

    const debugMsg = sent ? "Código reenviado." : `(DEBUG) Tu código es: ${code}`;

    return NextResponse.json({
        status: 'SUCCESS',
        message: debugMsg,
        attemptsLeft: 3 - (user.verifAttempts + 1)
    });
}
