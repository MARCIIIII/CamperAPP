import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";

export default async function SuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id, status: "PAID" },
    include: { slot: { select: { name: true } } },
  });

  if (!booking) notFound();

  const fmt = (d: Date) => format(d, "dd. MMMM yyyy", { locale: de });

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Erfolgs-Animation */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Zahlung erfolgreich!</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Dein Zugangscode wurde an <strong>{booking.guestEmail}</strong> geschickt.
          </p>
        </div>

        {/* Buchungsdetails */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Buchungsnr.</span>
            <span className="font-mono font-semibold text-gray-800">#{booking.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Stellplatz</span>
            <span className="font-semibold text-gray-800">{booking.slot.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Anreise</span>
            <span className="font-semibold text-gray-800">{fmt(booking.startDate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Abreise</span>
            <span className="font-semibold text-gray-800">{fmt(booking.endDate)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">Bezahlt</span>
            <span className="font-bold text-green-700">{booking.totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 text-sm text-amber-800">
          <strong>📧 Schau in deine E-Mails</strong> — dort findest du den Zugangscode für das Grundstück.
          Bitte überprüfe auch deinen Spam-Ordner, falls die Mail nicht ankommt.
        </div>

        <Link
          href="/"
          className="mt-6 block w-full text-center py-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}
