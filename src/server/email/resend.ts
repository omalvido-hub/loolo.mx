import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = "Nelzzon <noreply@nelzzon.com>";

export async function sendResetPasswordEmail(to: string, url: string) {
  if (!resend) {
    console.error(
      `[email] RESEND_API_KEY no está configurado — no se pudo enviar el correo de recuperación a ${to}. Enlace: ${url}`
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Recupera el acceso a tu cuenta de Nelzzon",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 18px;">Recupera tu contraseña</h1>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          Pediste restablecer tu contraseña en Nelzzon. Este enlace vale por 1 hora.
        </p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="background: #111; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">
            Elegir nueva contraseña
          </a>
        </p>
        <p style="color: #888; font-size: 12px;">
          Si no fuiste tú, ignora este correo — tu contraseña actual sigue funcionando.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error(`[email] Falló el envío del correo de recuperación a ${to}:`, error);
  }
}
