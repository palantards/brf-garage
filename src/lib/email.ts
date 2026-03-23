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
  const { error } = await resend.emails.send({
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

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendOfferEmail({
  to,
  associationName,
  spotIdentifier,
  expiresAt,
}: {
  to: string;
  associationName: string;
  spotIdentifier: string;
  expiresAt: Date;
}) {
  const dashboardUrl = `${process.env.AUTH_URL}/dashboard`;
  const deadline = expiresAt.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Du har fått ett erbjudande om plats ${spotIdentifier} – BRF Garage`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Du har fått ett erbjudande!</h2>
        <p>
          Garageplats <strong>${spotIdentifier}</strong> i ${associationName} är nu ledig
          och erbjuds till dig baserat på din köplats.
        </p>
        <p style="background: #f0f4ff; padding: 16px; border-radius: 8px; text-align: center;">
          <strong>Sista svarsdatum:</strong><br/>
          <span style="font-size: 18px; color: #0053db;">${deadline}</span>
        </p>
        <p>Logga in för att acceptera eller tacka nej till erbjudandet.</p>
        <a href="${dashboardUrl}" style="
          display: inline-block;
          margin: 24px 0;
          padding: 12px 24px;
          background: #0053db;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">Gå till dashboarden</a>
        <p style="color: #6b7280; font-size: 14px;">
          Om du inte svarar innan deadline går erbjudandet vidare till nästa person i kön.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
