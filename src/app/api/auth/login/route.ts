import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Use Singleton!
import { sendVerificationEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
    try {
        console.log("🟢 Login Request Received");
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        console.log("🔍 Looking for user:", email);
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                shifts: {
                    where: { status: 'OPEN' },
                    take: 1
                }
            }
        });

        // --- NEW USER FLOW ---
        if (!user) {
            console.log("👤 New User detected. Creating...");
            const code = generateCode();
            const hashedPassword = await bcrypt.hash(password, 10);

            // First user is ADMIN, others are STAFF (optional logic, keeping simple for now defaulting to STAFF)
            // But if it's the specific admin email, we could upgrade access.
            const userCount = await prisma.user.count();
            const role = userCount === 0 ? 'ADMIN' : 'STAFF';

            const newUser = await prisma.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    verificationCode: code,
                    isVerified: false,
                    verifAttempts: 0,
                    role: role
                }
            });
            console.log("✅ User created:", newUser.id, "Role:", role);

            // Email attempt (Background - Fire & Forget)
            sendVerificationEmail(email, code).catch(err =>
                console.error("⚠️ Background Email failed:", err)
            );

            return NextResponse.json({
                status: 'VERIFY_NEEDED',
                message: "Código enviado a tu correo"
            });
        }

        // --- EXISTING USER FLOW ---
        console.log("👤 Existing User found. Role:", user.role);
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            console.warn("🔐 Invalid Password");
            return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
        }

        if (!user.isVerified) {
            console.log("🔒 User not verified. Sending new code.");
            const code = generateCode();

            // Parallel execution: Update DB AND Send Email together, but wait for DB only
            await prisma.user.update({
                where: { id: user.id },
                data: { verificationCode: code }
            });

            // Email attempt (Background - Fire & Forget)
            sendVerificationEmail(email, code).catch(err =>
                console.error("⚠️ Background Email failed:", err)
            );

            return NextResponse.json({
                status: 'VERIFY_NEEDED',
                message: "Verificación requerida."
            });
        }

        // --- CHECK ACTIVE SHIFT FOR STAFF ---
        const openShift = user.shifts[0] || null;

        console.log("🔓 Login Successful");
        return NextResponse.json({
            status: 'SUCCESS',
            message: "Bienvenido",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                activeShiftId: openShift?.id || null
            }
        });

    } catch (error: any) {
        console.error("🔴 SERVER ERROR:", error);
        return NextResponse.json({
            error: "Error Interno del Servidor",
            details: error.message
        }, { status: 500 });
    }
}
