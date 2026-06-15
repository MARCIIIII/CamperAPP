import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { slotId, guestName, guestEmail, guestAddress, startDate, endDate, bookingType, totalPrice } = body;

  if (!slotId || !guestName || !guestEmail || !startDate || !endDate || !totalPrice) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return NextResponse.json({ error: "Abreise muss nach Anreise liegen" }, { status: 400 });
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
      bookingType,
      totalPrice,
      status: "PENDING",
    },
  });

  return NextResponse.json({ bookingId: booking.id }, { status: 201 });
}

export async function GET(req: Request) {
  const auth = req.headers.get("x-admin-password");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    include: { slot: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}
