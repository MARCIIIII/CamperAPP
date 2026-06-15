import { prisma } from "@/lib/prisma";
import SlotCard from "@/components/SlotCard";

export const revalidate = 60;

export default async function HomePage() {
  const slots = await prisma.slot.findMany({
    where: { isActive: true },
    include: {
      bookings: {
        where: {
          status: "PAID",
          endDate: { gte: new Date() },
        },
        select: { startDate: true, endDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">🏕️ CamperSlot</h1>
            <p className="text-green-200 text-sm mt-0.5">Stellplätze buchen – einfach & direkt</p>
          </div>
          <a href="/admin" className="text-green-200 hover:text-white text-sm underline underline-offset-2">
            Admin
          </a>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Verfügbare Stellplätze</h2>
        <p className="text-gray-500 text-sm mb-6">
          Wähle einen freien Platz, gib deine Reisedaten ein und zahle bequem per PayPal.
          Den Zugangscode erhältst du sofort per E-Mail.
        </p>

        {slots.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🅿️</p>
            <p>Aktuell sind keine Stellplätze verfügbar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {slots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        )}
      </section>

      <footer className="text-center text-xs text-gray-400 py-8">
        © {new Date().getFullYear()} CamperSlot · Alle Preise inkl. MwSt.
      </footer>
    </main>
  );
}
