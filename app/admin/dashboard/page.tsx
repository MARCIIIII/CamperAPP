import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const revalidate = 0;

const GUEST_COLORS = ["bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-pink-500", "bg-teal-500", "bg-indigo-500"];
function guestColor(name: string) {
  const idx = name.charCodeAt(0) % GUEST_COLORS.length;
  return GUEST_COLORS[idx];
}

export default async function DashboardPage() {
  const [totalSlots, occupiedSlots, paidBookings, pendingBookings] = await Promise.all([
    prisma.slot.count({ where: { isActive: true } }),
    prisma.booking.groupBy({
      by: ["slotId"],
      where: { status: "PAID", startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    }),
    prisma.booking.findMany({ where: { status: "PAID" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
  ]);

  const revenue = paidBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots.length / totalSlots) * 100) : 0;

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
    { label: "Belegungsrate", value: `${occupancyRate}%`, icon: "📊", accent: "from-teal-500/20 to-teal-500/5 border-teal-800/60" },
    { label: "Gesamteinnahmen", value: `${revenue.toFixed(2)} €`, icon: "💰", accent: "from-green-500/20 to-green-500/5 border-green-800/60" },
    { label: "Heutige Anreisen", value: arrivals, icon: "🚐", accent: "from-amber-500/20 to-amber-500/5 border-amber-800/60" },
    { label: "Heutige Abreisen", value: departures, icon: "👋", accent: "from-purple-500/20 to-purple-500/5 border-purple-800/60" },
    { label: "Offene Service-Anfragen", value: serviceRequests, icon: "🔧", accent: "from-red-500/20 to-red-500/5 border-red-800/60" },
    { label: "Ausstehende Zahlungen", value: pendingBookings, icon: "⏳", accent: "from-gray-500/10 to-gray-500/5 border-gray-700" },
  ];

  const QUICK_ACTIONS = [
    { href: "/admin/slots", label: "+ Neuer Stellplatz" },
    { href: "/admin/bookings", label: "Alle Buchungen" },
  ];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-2">
          {QUICK_ACTIONS.map((a) => (
            <a key={a.href} href={a.href}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">
              {a.label}
            </a>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6 capitalize">{format(today, "EEEE, dd. MMMM yyyy", { locale: de })}</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border bg-gradient-to-br ${s.accent} p-4`}>
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
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-full ${guestColor(b.guestName)} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
                      {b.guestName.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-white">{b.guestName}</span>
                  </div>
                </td>
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
