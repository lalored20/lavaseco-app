
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // rmendivilmora2@gmail.com
        pass: process.env.EMAIL_PASS, // App Password
    },
});

export async function sendVerificationEmail(to: string, code: string) {
    try {
        const info = await transporter.sendMail({
            from: '"Lavaseco Orquídeas" <no-reply@lavaseco.com>',
            to,
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
        console.log("Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}
