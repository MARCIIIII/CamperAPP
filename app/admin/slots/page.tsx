import { prisma } from "@/lib/prisma";
import SlotManager from "@/components/admin/SlotManager";

export const revalidate = 0;

export default async function SlotsPage() {
  const slots = await prisma.slot.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Stellplätze</h1>
      </div>
      <SlotManager initialSlots={slots} />
    </div>
  );
}
