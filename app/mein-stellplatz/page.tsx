"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerLoginPage() {
  const [bookingRef, setBookingRef] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const res = await fetch("/api/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: bookingRef.trim(), email: email.trim() }),
    });
    const data = await res.json();

    if (res.ok) {
      router.push(`/mein-stellplatz/${data.bookingId}`);
    } else {
      setError(data.error || "Fehler beim Einloggen");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏕️</div>
          <h1 className="text-2xl font-bold text-gray-900">Mein Stellplatz</h1>
          <p className="text-gray-500 text-sm mt-1">Gib deine Buchungsnummer und E-Mail ein</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Buchungsnummer</label>
            <input
              type="text"
              value={bookingRef}
              onChange={e => setBookingRef(e.target.value.toUpperCase())}
              required
              placeholder="z.B. ABC12345"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">Die letzten 8 Zeichen aus deiner Bestätigungs-E-Mail</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-Mail-Adresse</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="deine@email.de"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm"
          >
            {loading ? "Suche…" : "Weiter →"}
          </button>
        </form>
        <p className="text-center mt-4">
          <a href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Zurück zur Buchungsseite</a>
        </p>
      </div>
    </main>
  );
}
