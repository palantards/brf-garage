import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM!;

export async function sendInviteEmail({
  to,
  associationName,
  inviteUrl,
}: {
  to: string;
  associationName: string;
  inviteUrl: string;
}) {
  await resend.emails.send({
    from,
    to,
    subject: `Du har bjudits in till ${associationName} – BRF Garage`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Välkommen till ${associationName}</h2>
        <p>Du har bjudits in att använda BRF Garage för att hantera din plats i garaget.</p>
        <p>Klicka på knappen nedan för att aktivera ditt konto och välja ett lösenord.</p>
        <a href="${inviteUrl}" style="
          display: inline-block;
          margin: 24px 0;
          padding: 12px 24px;
          background: #1d4ed8;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">Aktivera konto</a>
        <p style="color: #6b7280; font-size: 14px;">
          Länken är giltig i 7 dagar. Om du inte förväntade dig detta mejl kan du ignorera det.
        </p>
      </div>
    `,
  });
}
