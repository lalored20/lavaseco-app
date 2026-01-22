import { NextResponse } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    // Verificar si OpenAI está configurado
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({
            error: 'El asistente de IA no está disponible',
            message: 'Esta funcionalidad requiere configuración adicional de OpenAI. Por favor contacta al administrador del sistema.'
        }, { status: 503 });
    }

    // Si OpenAI está configurado, retornar mensaje informativo por ahora
    // TODO: Implementar funcionalidad completa de chat cuando se configure OpenAI
    return NextResponse.json({
        message: 'Chat AI está en configuración',
        status: 'pending'
    });
}
