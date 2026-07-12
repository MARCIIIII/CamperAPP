import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { differenceInDays, differenceInMonths } from "date-fns";

export async function POST(req: Request) {
  const body = await req.json();
  const { slotId, guestName, guestEmail, guestAddress, startDate, endDate, bookingType } = body;

  if (!slotId || !guestName || !guestEmail || !startDate || !endDate) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return NextResponse.json({ error: "Abreise muss nach Anreise liegen" }, { status: 400 });
  }

  const slot = await prisma.slot.findUnique({ where: { id: slotId, isActive: true } });
  if (!slot) {
    return NextResponse.json({ error: "Stellplatz nicht gefunden" }, { status: 404 });
  }

  // Preis wird ausschließlich serverseitig berechnet — der Client kann den
  // Betrag nicht mehr manipulieren (siehe Code-Review-Fund #1).
  const type = bookingType === "MONTHLY" ? "MONTHLY" : "DAILY";
  let totalPrice: number;
  if (type === "MONTHLY") {
    const months = differenceInMonths(end, start);
    if (months <= 0) {
      return NextResponse.json({ error: "Zeitraum zu kurz für Monatsbuchung" }, { status: 400 });
    }
    totalPrice = Math.round(months * slot.pricePerMonth * 100) / 100;
  } else {
    const days = differenceInDays(end, start);
    if (days <= 0) {
      return NextResponse.json({ error: "Ungültiger Zeitraum" }, { status: 400 });
    }
    totalPrice = Math.round(days * slot.pricePerDay * 100) / 100;
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      slotId,
      status: "PAID",
      AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
    },
  });

  if (conflict) {
    return NextResponse.json({ error: "Zeitraum bereits gebucht" }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      slotId,
      guestName,
      guestEmail,
      guestAddress: guestAddress || "",
      startDate: start,
      endDate: end,
      bookingType: type,
      totalPrice,
      status: "PENDING",
    },
  });

  return NextResponse.json({ bookingId: booking.id }, { status: 201 });
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    include: { slot: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}
