import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";
import { sendBookingConfirmation } from "@/lib/email";

export async function POST(req: Request) {
  const { orderId, bookingId } = await req.json();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
  }
  if (booking.status === "PAID") {
    return NextResponse.json({ success: true }); // idempotent
  }

  const capture = await capturePayPalOrder(orderId);
  const status = capture.status;

  if (status !== "COMPLETED") {
    return NextResponse.json({ error: `Zahlung nicht abgeschlossen: ${status}` }, { status: 400 });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "PAID", paypalOrderId: orderId },
  });

  await sendBookingConfirmation({
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    slotName: booking.slot.name,
    startDate: booking.startDate,
    endDate: booking.endDate,
    totalPrice: booking.totalPrice,
    accessCode: booking.slot.accessCode,
    bookingId: booking.id,
  });

  return NextResponse.json({ success: true });
}
