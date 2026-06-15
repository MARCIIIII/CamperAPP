"use client";

import { useState } from "react";
import { differenceInDays, differenceInMonths, format } from "date-fns";
import { de } from "date-fns/locale";

type Props = {
  slotId: string;
  pricePerDay: number;
  pricePerMonth: number;
  bookedRanges: { start: string; end: string }[];
};

type BookingType = "DAILY" | "MONTHLY";

export default function BookingForm({ slotId, pricePerDay, pricePerMonth, bookedRanges }: Props) {
  const [bookingType, setBookingType] = useState<BookingType>("DAILY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestStreet, setGuestStreet] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [datenschutzAccepted, setDatenschutzAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  function calcTotal(): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (bookingType === "DAILY") {
      const days = differenceInDays(end, start);
      return days > 0 ? days * pricePerDay : 0;
    } else {
      const months = differenceInMonths(end, start);
      return months > 0 ? months * pricePerMonth : 0;
    }
  }

  function isConflict(): boolean {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return bookedRanges.some((r) => {
      const rs = new Date(r.start);
      const re = new Date(r.end);
      return start < re && end > rs;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isConflict()) {
      setError("Diese Daten überschneiden sich mit einer bestehenden Buchung.");
      return;
    }

    const total = calcTotal();
    if (total <= 0) {
      setError("Bitte gültige Daten wählen.");
      return;
    }

    if (!agbAccepted || !datenschutzAccepted) {
      setError("Bitte AGB und Datenschutzerklärung akzeptieren.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          guestName,
          guestEmail,
          guestAddress: `${guestStreet}, ${guestCity}`,
          startDate,
          endDate,
          bookingType,
          totalPrice: total,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Buchen");

      window.location.href = `/booking/${data.bookingId}/pay`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  const total = calcTotal();
  const conflict = isConflict();

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Buchung anfragen</h2>

      {/* Buchungsart */}
      <div className="flex gap-3">
        {(["DAILY", "MONTHLY"] as BookingType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setBookingType(t)}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              bookingType === t
                ? "bg-green-600 text-white border-green-600"
                : "border-gray-200 text-gray-600 hover:border-green-400"
            }`}
          >
            {t === "DAILY" ? "Tageweise" : "Monatlich"}
          </button>
        ))}
      </div>

      {/* Daten */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Anreise</label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Abreise</label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Gast */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Dein Name</label>
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          required
          placeholder="Max Mustermann"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">E-Mail (für den Zugangscode)</label>
        <input
          type="email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          required
          placeholder="max@example.de"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Straße und Hausnummer</label>
        <input
          type="text"
          value={guestStreet}
          onChange={(e) => setGuestStreet(e.target.value)}
          required
          placeholder="Musterstraße 12"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">PLZ und Ort</label>
        <input
          type="text"
          value={guestCity}
          onChange={(e) => setGuestCity(e.target.value)}
          required
          placeholder="12345 Berlin"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Rechtliches */}
      <div className="space-y-3 pt-1">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agbAccepted}
            onChange={(e) => setAgbAccepted(e.target.checked)}
            className="mt-0.5 accent-green-600"
          />
          <span className="text-sm text-gray-600">
            Ich habe die{" "}
            <a href="/agb" target="_blank" className="text-green-700 underline">AGB</a>
            {" "}gelesen und akzeptiere sie. Ich stimme zu, dass mein Widerrufsrecht gemäß
            § 312g Abs. 2 Nr. 9 BGB bei Stellplatzbuchungen ausgeschlossen ist.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={datenschutzAccepted}
            onChange={(e) => setDatenschutzAccepted(e.target.checked)}
            className="mt-0.5 accent-green-600"
          />
          <span className="text-sm text-gray-600">
            Ich habe die{" "}
            <a href="/datenschutz" target="_blank" className="text-green-700 underline">Datenschutzerklärung</a>
            {" "}zur Kenntnis genommen.
          </span>
        </label>
      </div>

      {/* Konflikte / Fehler */}
      {conflict && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          ⚠️ Diese Daten sind bereits gebucht. Bitte einen anderen Zeitraum wählen.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Preisanzeige */}
      {total > 0 && !conflict && (
        <div className="bg-green-50 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-600">Gesamtpreis</span>
          <span className="text-xl font-bold text-green-700">{total.toFixed(2)} €</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || conflict || total <= 0}
        className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm transition-colors"
      >
        {loading ? "Wird gebucht…" : "Weiter zur Zahlung →"}
      </button>
    </form>
  );
}
