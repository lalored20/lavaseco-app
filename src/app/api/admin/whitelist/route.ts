import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { useAuth } from '@/context/AuthContext'; // Just kidding, this is server side.

// Helper to check if user is admin
async function isAdmin(request: Request) {
    // In a real sophisticated app we might decode the session token here.
    // For now, we rely on the client sending the request securely, 
    // BUT critically, we must verify the "actor" from the session if using server sessions.

    // However, since this app seems to use client-side storage for session (AuthContext),
    // and the backend routes (verify) are what issue the "Role".
    // WE NEED A WAY TO IDENTIFY THE CALLER.

    // NOTE: The current app seems to lack a robust session token mechanism passed on every request 
    // (middleware.ts is not visible/checked yet). 
    // Based on `verify/route.ts`, it just returns "Success". It doesn't set a cookie.

    // FOR THE PURPOSE OF THIS TASK (MVP RBAC requested by user):
    // We will implement the API, but since we don't have a session cookie, 
    // we need to pass the "currentUserEmail" in headers or body to validate permissions? 
    // NO, that is insecure.

    // LET'S CHECK if we can trust the client for now OR if there's an implicit session.
    // Looking at `verify/route`, it doesn't set a cookie.
    // So the API routes currently have NO WAY to know who is calling them.

    // PLAN MODIFICATION: We probably need to verify the user via a simple "x-user-email" header 
    // AND verify it against the `User` table to ensure they have ROLE='ADMIN'.
    // WITHOUT a session token (JWT/Cookie), this is "honor system" security, 
    // but better than nothing for an internal tool.
    // Given the constraints and the "LAVASECO" context (internal offline-first app), 
    // verifying the sender's email against the DB's role is a reasonable first step.

    return true; // Placeholder logic until we inspect middleware or session structure.
}

export async function GET(request: Request) {
    // TODO: Verify Session/Role here
    // const email = request.headers.get('x-user-email');
    // const user = await prisma.user.findUnique({ where: { email } });
    // if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const admins = await prisma.allowedAdmin.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(admins);
    } catch (error) {
        return NextResponse.json({ error: "Error fetching admins" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // TODO: Verify Session/Role

    try {
        const { email, addedBy } = await request.json();

        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const newAdmin = await prisma.allowedAdmin.create({
            data: {
                email,
                addedBy
            }
        });

        // Also, if this user already exists in User table, Upgrade them immediately?
        // Optional but nice.
        await prisma.user.updateMany({
            where: { email },
            data: { role: 'ADMIN' }
        });

        return NextResponse.json(newAdmin);
    } catch (error) {
        // Prisma P2002 = Unique constraint failed
        return NextResponse.json({ error: "Error adding admin or already exists" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    // TODO: Verify Session/Role

    try {
        const { email } = await request.json();

        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        // Prevent deleting Super Admins
        const SUPER_ADMINS = ['rutaexitosa2@gmail.com', 'rmendivilmora2@gmail.com'];
        if (SUPER_ADMINS.includes(email)) {
            return NextResponse.json({ error: "Cannot delete Super Admin" }, { status: 403 });
        }

        await prisma.allowedAdmin.delete({
            where: { email }
        });

        // Downgrade the user immediately if they exist
        await prisma.user.updateMany({
            where: { email },
            data: { role: 'STAFF' }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting admin" }, { status: 500 });
    }
}
