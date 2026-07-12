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

  // Die Zahlung ist bei PayPal bereits abgeschlossen — hier nur noch prüfen,
  // ob in der Zwischenzeit eine andere Buchung für denselben Zeitraum bereits
  // bezahlt wurde (Race Condition bei gleichzeitigen Buchungen, siehe
  // Code-Review-Fund #3). SQLite serialisiert Schreibtransaktionen, was das
  // Zeitfenster für dieses Rennen praktisch schließt.
  const result = await prisma.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        slotId: booking.slotId,
        status: "PAID",
        id: { not: booking.id },
        AND: [{ startDate: { lt: booking.endDate } }, { endDate: { gt: booking.startDate } }],
      },
    });
    if (conflict) return { conflict: true };

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "PAID", paypalOrderId: orderId },
    });
    return { conflict: false };
  });

  if (result.conflict) {
    // Zahlung ist bereits erfolgt, aber der Zeitraum wurde zwischenzeitlich
    // anderweitig vergeben — braucht manuelle Rückerstattung durch den Admin.
    return NextResponse.json(
      { error: "Dieser Zeitraum wurde inzwischen anderweitig gebucht. Bitte kontaktiere uns — deine Zahlung wird erstattet." },
      { status: 409 }
    );
  }

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
