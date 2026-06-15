import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BookingForm from "@/components/BookingForm";

export default async function SlotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const slot = await prisma.slot.findUnique({
    where: { id, isActive: true },
    include: {
      bookings: {
        where: { status: "PAID", endDate: { gte: new Date() } },
        select: { startDate: true, endDate: true },
      },
    },
  });

  if (!slot) notFound();

  const bookedRanges = slot.bookings.map((b) => ({
    start: b.startDate.toISOString(),
    end: b.endDate.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <a href="/" className="text-green-200 hover:text-white text-sm">← Zurück</a>
          <span className="text-green-400">/</span>
          <span className="font-semibold">{slot.name}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{slot.name}</h1>
          {slot.description && <p className="text-gray-500 mb-4">{slot.description}</p>}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-400 block text-xs">Pro Tag</span>
              <span className="font-bold text-lg text-green-700">{slot.pricePerDay.toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs">Pro Monat</span>
              <span className="font-bold text-lg text-green-700">{slot.pricePerMonth.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <BookingForm
          slotId={slot.id}
          pricePerDay={slot.pricePerDay}
          pricePerMonth={slot.pricePerMonth}
          bookedRanges={bookedRanges}
        />
      </div>
    </main>
  );
}
