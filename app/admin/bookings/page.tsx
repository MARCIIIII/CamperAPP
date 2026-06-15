import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const revalidate = 0;

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-900 text-green-300",
  PENDING: "bg-amber-900 text-amber-300",
  CANCELLED: "bg-red-900 text-red-300",
};
const STATUS_LABEL: Record<string, string> = { PAID: "Bezahlt", PENDING: "Ausstehend", CANCELLED: "Storniert" };

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { slot: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const fmt = (d: Date) => format(d, "dd.MM.yy", { locale: de });

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-white mb-6">Buchungen</h1>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800">
              <th className="text-left px-4 py-3">Nr.</th>
              <th className="text-left px-4 py-3">Gast</th>
              <th className="text-left px-4 py-3">E-Mail</th>
              <th className="text-left px-4 py-3">Stellplatz</th>
              <th className="text-left px-4 py-3">Zeitraum</th>
              <th className="text-right px-4 py-3">Betrag</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{b.id.slice(-6).toUpperCase()}</td>
                <td className="px-4 py-3 text-white">{b.guestName}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{b.guestEmail}</td>
                <td className="px-4 py-3 text-gray-300">{b.slot.name}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {fmt(b.startDate)} – {fmt(b.endDate)}
                </td>
                <td className="px-4 py-3 text-right text-green-400 font-medium">{b.totalPrice.toFixed(2)} €</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Noch keine Buchungen</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
