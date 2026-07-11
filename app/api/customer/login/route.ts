import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { bookingId, email } = await req.json();

  if (!bookingId || !email) {
    return NextResponse.json({ error: "Buchungsnummer und E-Mail erforderlich" }, { status: 400 });
  }

  const candidates = await prisma.booking.findMany({
    where: {
      id: { endsWith: bookingId.toLowerCase() },
      status: "PAID",
    },
  });

  const booking = candidates.find(
    (b) => b.guestEmail.toLowerCase() === email.toLowerCase()
  );

  if (!booking) {
    return NextResponse.json({ error: "Keine Buchung gefunden. Bitte prüfe Buchungsnummer und E-Mail." }, { status: 404 });
  }

  return NextResponse.json({ bookingId: booking.id });
}
