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

export async function sendApplicationFormEmail({
  to,
  associationName,
  applyUrl,
}: {
  to: string;
  associationName: string;
  applyUrl: string;
}) {
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Ansök om garageplats – ${associationName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Ansök om garageplats</h2>
        <p>
          ${associationName} har bjudit in dig att ansöka om en garageplats.
        </p>
        <p>Klicka på knappen nedan för att fylla i din ansökan.</p>
        <a href="${applyUrl}" style="
          display: inline-block;
          margin: 24px 0;
          padding: 12px 24px;
          background: #0053db;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">Fyll i ansökan</a>
        <p style="color: #6b7280; font-size: 14px;">
          Om du inte förväntade dig detta mejl kan du ignorera det.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendApplicationSubmittedEmail({
  to,
  applicantName,
  applicantEmail,
}: {
  to: string;
  applicantName: string;
  applicantEmail: string;
}) {
  const dashboardUrl = `${process.env.AUTH_URL}/dashboard/applications`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Ny ansökan mottagen från ${applicantName || applicantEmail} – BRF Garage`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Ny ansökan mottagen</h2>
        <p>
          <strong>${applicantName || applicantEmail}</strong> har skickat in en ansökan om garageplats.
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
        ">Granska ansökan</a>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendApplicationDecisionEmail({
  to,
  associationName,
  applicantName,
  approved,
}: {
  to: string;
  associationName: string;
  applicantName: string;
  approved: boolean;
}) {
  const subject = approved
    ? `Din ansökan har godkänts – ${associationName}`
    : `Din ansökan har avslagits – ${associationName}`;

  const body = approved
    ? `
      <h2>Din ansökan har godkänts!</h2>
      <p>
        Hej ${applicantName}, din ansökan om garageplats i ${associationName} har godkänts.
        Du kommer att kontaktas med mer information.
      </p>
    `
    : `
      <h2>Din ansökan har avslagits</h2>
      <p>
        Hej ${applicantName}, tyvärr har din ansökan om garageplats
        i ${associationName} avslagits. Kontakta styrelsen för mer information.
      </p>
    `;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        ${body}
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendResignationFormEmail({
  to,
  associationName,
  spotIdentifier,
  resignUrl,
}: {
  to: string;
  associationName: string;
  spotIdentifier: string;
  resignUrl: string;
}) {
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Bekräfta uppsägning av plats ${spotIdentifier} – ${associationName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Bekräfta din uppsägning</h2>
        <p>
          ${associationName} har tagit emot din begäran om att säga upp
          garageplats <strong>${spotIdentifier}</strong>.
        </p>
        <p>Klicka på knappen nedan för att bekräfta uppsägningen.</p>
        <a href="${resignUrl}" style="
          display: inline-block;
          margin: 24px 0;
          padding: 12px 24px;
          background: #0053db;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">Bekräfta uppsägning</a>
        <p style="color: #6b7280; font-size: 14px;">
          Om du inte vill säga upp din plats kan du ignorera detta mejl.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendResignationConfirmedEmail({
  to,
  residentName,
  spotIdentifier,
}: {
  to: string;
  residentName: string;
  spotIdentifier: string;
}) {
  const dashboardUrl = `${process.env.AUTH_URL}/dashboard/resignations`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Uppsägning bekräftad av ${residentName} – plats ${spotIdentifier}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Uppsägning bekräftad</h2>
        <p>
          <strong>${residentName}</strong> har bekräftat sin uppsägning av
          garageplats <strong>${spotIdentifier}</strong>.
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
        ">Granska uppsägningen</a>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendResignationDecisionEmail({
  to,
  associationName,
  spotIdentifier,
  approved,
}: {
  to: string;
  associationName: string;
  spotIdentifier: string;
  approved: boolean;
}) {
  const subject = approved
    ? `Din uppsägning av plats ${spotIdentifier} har godkänts – ${associationName}`
    : `Din uppsägning av plats ${spotIdentifier} har avslagits – ${associationName}`;

  const body = approved
    ? `
      <h2>Uppsägningen har godkänts</h2>
      <p>
        Din uppsägning av garageplats <strong>${spotIdentifier}</strong>
        i ${associationName} har godkänts. Uppsägningstiden har börjat löpa.
        Du kommer att kontaktas med mer information.
      </p>
    `
    : `
      <h2>Uppsägningen har avslagits</h2>
      <p>
        Din uppsägning av garageplats <strong>${spotIdentifier}</strong>
        i ${associationName} har avslagits. Kontakta styrelsen för mer information.
      </p>
    `;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        ${body}
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
