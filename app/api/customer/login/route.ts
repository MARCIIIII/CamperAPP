import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeCustomerToken, CUSTOMER_COOKIE } from "@/lib/auth";

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

  const res = NextResponse.json({ bookingId: booking.id });
  res.cookies.set(CUSTOMER_COOKIE, `${booking.id}:${await makeCustomerToken(booking.id)}`, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
  });
  return res;
}
