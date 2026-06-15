import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { bookingId, email } = await req.json();

  if (!bookingId || !email) {
    return NextResponse.json({ error: "Buchungsnummer und E-Mail erforderlich" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: { endsWith: bookingId.toLowerCase() },
      guestEmail: { equals: email.toLowerCase(), mode: "insensitive" },
      status: "PAID",
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Keine Buchung gefunden. Bitte prüfe Buchungsnummer und E-Mail." }, { status: 404 });
  }

  return NextResponse.json({ bookingId: booking.id });
}
