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

export async function sendAssignmentConfirmationEmail({
  to,
  associationName,
  spotIdentifier,
}: {
  to: string;
  associationName: string;
  spotIdentifier: string;
}) {
  const dashboardUrl = `${process.env.AUTH_URL}/dashboard`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Du har tilldelats garageplats ${spotIdentifier} – BRF Garage`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Grattis — du har fått en garageplats!</h2>
        <p>
          Du är nu tilldelad garageplats <strong>${spotIdentifier}</strong>
          i ${associationName}.
        </p>
        <p>
          Du kan se din plats och hantera ditt innehav i dashboarden.
        </p>
        <a href="${dashboardUrl}" style="
          display: inline-block;
          margin: 24px 0;
          padding: 12px 24px;
          background: #16a34a;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">Gå till dashboarden</a>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendQueueJoinEmail({
  to,
  associationName,
}: {
  to: string;
  associationName: string;
}) {
  const dashboardUrl = `${process.env.AUTH_URL}/dashboard`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Du står nu i kö – BRF Garage`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Du är nu med i kön!</h2>
        <p>
          Du har lagts till i kön för en garageplats i ${associationName}.
        </p>
        <p>
          Du kommer att erbjudas en plats när det blir din tur i kön.
          Du kan när som helst se din köplats och eventuella kommande platser i dashboarden.
        </p>
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
          Om du vill lämna kön kan du göra det när som helst via dashboarden.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendOfferExpiredEmail({
  to,
  associationName,
  spotIdentifier,
}: {
  to: string;
  associationName: string;
  spotIdentifier: string;
}) {
  const dashboardUrl = `${process.env.AUTH_URL}/dashboard`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Ditt erbjudande om plats ${spotIdentifier} har gått ut – BRF Garage`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Erbjudandet har gått ut</h2>
        <p>
          Ditt erbjudande om garageplats <strong>${spotIdentifier}</strong>
          i ${associationName} har tyvärr gått ut utan svar.
        </p>
        <p>
          Erbjudandet har nu gått vidare till nästa person i kön.
          Du står kvar i kön och kommer att erbjudas en plats igen när tillfälle ges.
        </p>
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
          Om du vill lämna kön kan du göra det när som helst via dashboarden.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendOfferReminderEmail({
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
    subject: `Påminnelse: Ditt erbjudande om plats ${spotIdentifier} går ut snart – BRF Garage`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Påminnelse — erbjudandet går snart ut!</h2>
        <p>
          Du har ett aktivt erbjudande om garageplats <strong>${spotIdentifier}</strong>
          i ${associationName} som snart löper ut.
        </p>
        <p style="background: #fff7ed; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #fed7aa;">
          <strong>Sista svarsdatum:</strong><br/>
          <span style="font-size: 18px; color: #c2410c;">${deadline}</span>
        </p>
        <p>Logga in för att acceptera eller tacka nej innan deadline.</p>
        <a href="${dashboardUrl}" style="
          display: inline-block;
          margin: 24px 0;
          padding: 12px 24px;
          background: #c2410c;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">Svara på erbjudandet</a>
        <p style="color: #6b7280; font-size: 14px;">
          Om du inte svarar innan deadline går erbjudandet vidare till nästa person i kön.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
