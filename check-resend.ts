
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("📧 Probando RESEND API...");
    const key = process.env.RESEND_API_KEY;
    console.log("Key Configurada:", key ? key.substring(0, 5) + "..." : "MISSING");

    if (!key) {
        console.error("❌ ERROR: No se encontró RESEND_API_KEY en .env");
        return;
    }

    const resend = new Resend(key);

    try {
        console.log("Enviando correo de prueba...");
        const { data, error } = await resend.emails.send({
            from: 'Lavaseco Orquídeas <onboarding@resend.dev>',
            // Nota: En modo prueba, Resend SOLO envía al correo del dueño de la cuenta.
            // Usaremos el mismo dominio safe si es posible, o hardcodeamos uno seguro para probar la API.
            to: ['rmendivilmora2@gmail.com'],
            subject: 'Test Resend API',
            html: '<strong>Si ves esto, Resend funciona!</strong>',
        });

        if (error) {
            console.error("❌ Error devuelto por Resend:");
            console.error(JSON.stringify(error, null, 2));
        } else {
            console.log("✅ ÉXITO. ID del correo:", data?.id);
        }

    } catch (e: any) {
        console.error("❌ Error de Excepción:");
        console.error(e);
    }
}

main();
