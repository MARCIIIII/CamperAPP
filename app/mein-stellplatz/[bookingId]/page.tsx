import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import CustomerDashboard from "@/components/CustomerDashboard";

export default async function CustomerPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, status: "PAID" },
    include: {
      slot: true,
      maintenanceEntries: { orderBy: { createdAt: "desc" } },
      serviceRequests: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!booking) notFound();

  return (
    <CustomerDashboard
      booking={{
        id: booking.id,
        guestName: booking.guestName,
        slotName: booking.slot.name,
        slotType: booking.slot.type,
        startDate: booking.startDate.toISOString(),
        endDate: booking.endDate.toISOString(),
        accessCode: booking.slot.accessCode,
        maintenanceEntries: booking.maintenanceEntries.map(e => ({
          id: e.id, title: e.title, description: e.description,
          dueDate: e.dueDate?.toISOString() ?? null,
          createdAt: e.createdAt.toISOString(),
        })),
        serviceRequests: booking.serviceRequests.map(r => ({
          id: r.id, type: r.type, message: r.message, status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      }}
    />
  );
}
