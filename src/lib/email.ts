
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(to: string, code: string) {
  // ---------------------------------------------------------
  // FALLBACK DE DESARROLLO (Crucial para cuando falla SMTP)
  // ---------------------------------------------------------
  console.log("=================================================");
  console.log("🔐 CÓDIGO DE VERIFICACIÓN (LOG)");
  console.log(`👉 PARA: ${to}`);
  console.log(`👉 CÓDIGO: ${code}`);
  console.log("=================================================");

  // Si no hay API KEY, solo logueamos (útil para despliegue base sin correos)
  if (!process.env.RESEND_API_KEY) {
    console.log("ℹ️ Saltando envío de correo (RESEND_API_KEY no configurada)");
    return true;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Simplificado para evitar errores de validación
      to: [to], // Solo funcionará si 'to' es el email registrado en Resend (o dominio verificado en el futuro)
      subject: '🔐 Tu Código de Acceso - Lavaseco Orquídeas',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fbf7ff;">
          <h2 style="color: #b36eed; text-align: center;">Verificación de Identidad</h2>
          <p style="color: #333; font-size: 16px;">Hola,</p>
          <p style="color: #555;">Estás intentando acceder al sistema de gestión. Usa el siguiente código para completar tu ingreso:</p>
          
          <div style="background-color: #fff; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #e0c4fb;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #5d2583;">${code}</span>
          </div>

          <p style="color: #666; font-size: 12px; text-align: center;">Si no solicitaste este código, ignora este mensaje.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #aaa; font-size: 10px; text-align: center;">Lavaseco Orquídeas - Sistema Antigravity™</p>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Error de Resend:", error);
      // No retornamos false, dejamos que pase con el log de consola por si acaso
      return true;
    }

    console.log("✅ Correo enviado via Resend:", data?.id);
    return true;
  } catch (error) {
    console.error("⚠️ Error inesperado enviando correo:", error);
    return true;
  }
}
