import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import PayPalButton from "@/components/PayPalButton";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { slot: { select: { name: true } } },
  });

  if (!booking) notFound();
  if (booking.status === "PAID") redirect(`/booking/${id}/success`);
  if (booking.status === "CANCELLED") notFound();

  const fmt = (d: Date) => format(d, "dd. MMM yyyy", { locale: de });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
          <a href="/" className="text-green-200 hover:text-white text-sm">← Zurück</a>
          <span className="text-green-400">/</span>
          <span className="font-semibold">Zahlung</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Buchungsübersicht */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-lg font-semibold text-gray-800 mb-4">Deine Buchung</h1>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Stellplatz</span>
              <span className="font-medium text-gray-900">{booking.slot.name}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Gast</span>
              <span className="font-medium text-gray-900">{booking.guestName}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Anreise</span>
              <span className="font-medium text-gray-900">{fmt(booking.startDate)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Abreise</span>
              <span className="font-medium text-gray-900">{fmt(booking.endDate)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
              <span className="font-semibold text-gray-800">Gesamt</span>
              <span className="text-xl font-bold text-green-700">{booking.totalPrice.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* PayPal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Sicher bezahlen mit PayPal</h2>
          <p className="text-xs text-gray-400 mb-5">
            Nach der Zahlung erhältst du sofort deinen Zugangscode per E-Mail an <strong>{booking.guestEmail}</strong>.
          </p>
          <PayPalButton bookingId={booking.id} amount={booking.totalPrice} />
        </div>

        <p className="text-xs text-center text-gray-400">
          Mit der Zahlung akzeptierst du unsere <a href="/agb" className="underline">AGB</a>.
          Kein Widerrufsrecht gemäß §312g Abs. 2 Nr. 9 BGB.
        </p>
      </div>
    </main>
  );
}
