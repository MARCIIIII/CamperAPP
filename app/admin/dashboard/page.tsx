import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export default async function DashboardPage() {
  const [totalSlots, totalBookings, paidBookings, pendingBookings] = await Promise.all([
    prisma.slot.count({ where: { isActive: true } }),
    prisma.booking.count(),
    prisma.booking.findMany({ where: { status: "PAID" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
  ]);

  const revenue = paidBookings.reduce((sum, b) => sum + b.totalPrice, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const arrivals = await prisma.booking.count({
    where: { status: "PAID", startDate: { gte: today, lt: tomorrow } },
  });
  const departures = await prisma.booking.count({
    where: { status: "PAID", endDate: { gte: today, lt: tomorrow } },
  });

  const recentBookings = await prisma.booking.findMany({
    where: { status: "PAID" },
    include: { slot: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const serviceRequests = await prisma.serviceRequest.count({ where: { status: "OPEN" } });

  const stats = [
    { label: "Aktive Stellplätze", value: totalSlots, icon: "🅿️", color: "bg-blue-900/40 border-blue-800" },
    { label: "Gesamteinnahmen", value: `${revenue.toFixed(2)} €`, icon: "💰", color: "bg-green-900/40 border-green-800" },
    { label: "Heutige Anreisen", value: arrivals, icon: "🚐", color: "bg-amber-900/40 border-amber-800" },
    { label: "Heutige Abreisen", value: departures, icon: "👋", color: "bg-purple-900/40 border-purple-800" },
    { label: "Offene Service-Anfragen", value: serviceRequests, icon: "🔧", color: "bg-red-900/40 border-red-800" },
    { label: "Ausstehende Zahlungen", value: pendingBookings, icon: "⏳", color: "bg-gray-800 border-gray-700" },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Letzte Buchungen</h2>
          <a href="/admin/bookings" className="text-xs text-green-400 hover:text-green-300">Alle anzeigen →</a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800">
              <th className="text-left px-5 py-3">Gast</th>
              <th className="text-left px-5 py-3">Stellplatz</th>
              <th className="text-left px-5 py-3">Zeitraum</th>
              <th className="text-right px-5 py-3">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((b) => (
              <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-5 py-3 text-white">{b.guestName}</td>
                <td className="px-5 py-3 text-gray-400">{b.slot.name}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(b.startDate).toLocaleDateString("de")} – {new Date(b.endDate).toLocaleDateString("de")}
                </td>
                <td className="px-5 py-3 text-right text-green-400 font-medium">{b.totalPrice.toFixed(2)} €</td>
              </tr>
            ))}
            {recentBookings.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500">Noch keine Buchungen</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
