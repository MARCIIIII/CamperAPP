"use client";

import Link from "next/link";

type Booking = { startDate: Date; endDate: Date };

type Slot = {
  id: string;
  name: string;
  type: "CAMPER" | "CARAVAN" | "GARAGE";
  description: string | null;
  pricePerDay: number;
  pricePerMonth: number;
  bookings: Booking[];
};

const TYPE_LABEL: Record<Slot["type"], string> = {
  CAMPER: "🚐 Camper",
  CARAVAN: "🚌 Wohnwagen",
  GARAGE: "🏠 Garage",
};

const TYPE_COLOR: Record<Slot["type"], string> = {
  CAMPER: "bg-green-100 text-green-800",
  CARAVAN: "bg-blue-100 text-blue-800",
  GARAGE: "bg-gray-100 text-gray-700",
};

function isAvailableToday(bookings: Booking[]): boolean {
  const today = new Date();
  return !bookings.some(
    (b) => new Date(b.startDate) <= today && new Date(b.endDate) >= today
  );
}

export default function SlotCard({ slot }: { slot: Slot }) {
  const available = isAvailableToday(slot.bookings);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Farbstreifen oben */}
      <div className={`h-1.5 ${available ? "bg-green-500" : "bg-red-400"}`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{slot.name}</h3>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${TYPE_COLOR[slot.type]}`}>
              {TYPE_LABEL[slot.type]}
            </span>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${available ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {available ? "Frei" : "Belegt"}
          </span>
        </div>

        {slot.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{slot.description}</p>
        )}

        <div className="flex gap-4 text-sm text-gray-700 mb-4">
          <div>
            <span className="text-gray-400 text-xs block">Pro Tag</span>
            <span className="font-semibold">{slot.pricePerDay.toFixed(2)} €</span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block">Pro Monat</span>
            <span className="font-semibold">{slot.pricePerMonth.toFixed(2)} €</span>
          </div>
        </div>

        <Link
          href={`/slot/${slot.id}`}
          className={`block w-full text-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            available
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
          }`}
        >
          {available ? "Jetzt buchen" : "Nicht verfügbar"}
        </Link>
      </div>
    </div>
  );
}
