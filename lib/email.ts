import { Resend } from "resend";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { escapeHtml } from "./html";

const resend = new Resend(process.env.RESEND_API_KEY);

type BookingEmailParams = {
  guestName: string;
  guestEmail: string;
  slotName: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  accessCode: string;
  bookingId: string;
};

export async function sendBookingConfirmation(params: BookingEmailParams) {
  const {
    guestName,
    guestEmail,
    slotName,
    startDate,
    endDate,
    totalPrice,
    accessCode,
    bookingId,
  } = params;

  const fmt = (d: Date) => format(d, "dd. MMMM yyyy", { locale: de });

  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #15803d; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 4px 0 0; opacity: 0.85; font-size: 14px; }
  .body { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; }
  .code-box { background: white; border: 2px dashed #15803d; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
  .code-box .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  .code-box .code { font-size: 42px; font-weight: bold; color: #15803d; letter-spacing: 8px; margin: 8px 0; }
  .details { background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e7eb; }
  .details table { width: 100%; border-collapse: collapse; }
  .details td { padding: 8px 0; font-size: 14px; }
  .details td:first-child { color: #6b7280; width: 140px; }
  .details td:last-child { font-weight: 600; }
  .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #92400e; margin: 16px 0; }
  .footer { text-align: center; font-size: 12px; color: #9ca3af; padding: 16px; }
</style></head>
<body>
  <div class="header">
    <h1>🏕️ Buchungsbestätigung</h1>
    <p>Dein Stellplatz ist gebucht und bezahlt</p>
  </div>
  <div class="body">
    <p>Hallo <strong>${escapeHtml(guestName)}</strong>,</p>
    <p>vielen Dank für deine Buchung! Hier ist dein persönlicher Zugangscode für das Grundstück:</p>

    <div class="code-box">
      <div class="label">Dein Zugangscode</div>
      <div class="code">${escapeHtml(accessCode)}</div>
      <div style="font-size:13px;color:#6b7280;">Gib diesen Code am Eingang ein</div>
    </div>

    <div class="details">
      <table>
        <tr><td>Buchungsnr.</td><td>#${bookingId.slice(-8).toUpperCase()}</td></tr>
        <tr><td>Stellplatz</td><td>${escapeHtml(slotName)}</td></tr>
        <tr><td>Anreise</td><td>${fmt(startDate)}</td></tr>
        <tr><td>Abreise</td><td>${fmt(endDate)}</td></tr>
        <tr><td>Bezahlter Betrag</td><td>${totalPrice.toFixed(2)} €</td></tr>
      </table>
    </div>

    <div class="warning">
      ⚠️ <strong>Wichtig:</strong> Bitte teile den Zugangscode nicht weiter. Er ist nur für den gebuchten Zeitraum gültig.
    </div>

    <p style="font-size:14px;color:#6b7280;">
      Bei Fragen erreichst du uns per E-Mail. Bitte gib dabei immer deine Buchungsnummer an.
    </p>
  </div>
  <div class="footer">
    CamperSlot · Diese E-Mail wurde automatisch generiert.
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: guestEmail,
    subject: `✅ Buchungsbestätigung – ${slotName} | Code: ${accessCode}`,
    html,
  });
}
