import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { bookingId, type, message } = await req.json();
  if (!bookingId || !type || !message) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { select: { name: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });

  const request = await prisma.serviceRequest.create({
    data: { bookingId, type, message, status: "OPEN" },
  });

  const TYPE_LABEL: Record<string, string> = { CLEANING: "Reinigung", MAINTENANCE: "Wartung", OTHER: "Sonstiges" };

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.EMAIL_FROM!,
    subject: `🔧 Service-Anfrage: ${TYPE_LABEL[type] || type} – ${booking.slot.name}`,
    html: `
      <h2>Neue Service-Anfrage</h2>
      <p><strong>Gast:</strong> ${booking.guestName} (${booking.guestEmail})</p>
      <p><strong>Stellplatz:</strong> ${booking.slot.name}</p>
      <p><strong>Typ:</strong> ${TYPE_LABEL[type] || type}</p>
      <p><strong>Nachricht:</strong></p>
      <blockquote style="border-left:3px solid #15803d;padding-left:12px;color:#555">${message}</blockquote>
      <hr>
      <p style="font-size:12px;color:#999">Buchungs-ID: ${booking.id}</p>
    `,
  });

  return NextResponse.json(request, { status: 201 });
}
