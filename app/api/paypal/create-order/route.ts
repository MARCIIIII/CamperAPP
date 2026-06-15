import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(req: Request) {
  const { bookingId } = await req.json();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
  }
  if (booking.status !== "PENDING") {
    return NextResponse.json({ error: "Buchung bereits bezahlt oder storniert" }, { status: 400 });
  }

  const order = await createPayPalOrder(booking.totalPrice, bookingId);
  return NextResponse.json({ orderId: order.id });
}
