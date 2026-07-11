"use client";

import { useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { de } from "date-fns/locale";

type MaintenanceEntry = { id: string; title: string; description: string | null; dueDate: string | null; createdAt: string };
type ServiceRequest = { id: string; type: string; message: string; status: string; createdAt: string };
type BookingData = {
  id: string; guestName: string; slotName: string; slotType: string;
  startDate: string; endDate: string; accessCode: string;
  maintenanceEntries: MaintenanceEntry[];
  serviceRequests: ServiceRequest[];
};

const TYPE_LABEL: Record<string, string> = { CAMPER: "🚐 Camper", CARAVAN: "🚌 Wohnwagen", GARAGE: "🏠 Garage" };
const SERVICE_LABEL: Record<string, string> = { CLEANING: "Reinigung", MAINTENANCE: "Wartung", OTHER: "Sonstiges" };
const fmt = (d: string) => format(new Date(d), "dd. MMM yyyy", { locale: de });

export default function CustomerDashboard({ booking }: { booking: BookingData }) {
  const [tab, setTab] = useState<"overview" | "camera" | "power" | "maintenance" | "service">("overview");
  const [entries, setEntries] = useState(booking.maintenanceEntries);
  const [requests, setRequests] = useState(booking.serviceRequests);

  // Wartungs-Formular
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDue, setMDue] = useState("");
  const [mSaving, setMSaving] = useState(false);

  // Service-Formular
  const [sType, setSType] = useState("CLEANING");
  const [sMsg, setSMsg] = useState("");
  const [sSaving, setSSaving] = useState(false);
  const [sSent, setSSent] = useState(false);

  async function addMaintenance() {
    if (!mTitle) return;
    setMSaving(true);
    const res = await fetch("/api/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, title: mTitle, description: mDesc, dueDate: mDue || null }),
    });
    if (res.ok) { const e = await res.json(); setEntries([e, ...entries]); setMTitle(""); setMDesc(""); setMDue(""); }
    setMSaving(false);
  }

  async function deleteMaintenance(id: string) {
    await fetch(`/api/maintenance?id=${id}`, { method: "DELETE" });
    setEntries(entries.filter(e => e.id !== id));
  }

  async function sendServiceRequest() {
    if (!sMsg) return;
    setSSaving(true);
    const res = await fetch("/api/service-request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, type: sType, message: sMsg }),
    });
    if (res.ok) { const r = await res.json(); setRequests([r, ...requests]); setSMsg(""); setSSent(true); }
    setSSaving(false);
  }

  const TABS = [
    { key: "overview", label: "Übersicht", icon: "🏠" },
    { key: "camera", label: "Kamera", icon: "📷" },
    { key: "power", label: "Strom", icon: "⚡" },
    { key: "maintenance", label: "Wartung", icon: "🔧" },
    { key: "service", label: "Service", icon: "📞" },
  ] as const;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const daysToArrival = differenceInCalendarDays(start, today);
  const daysToDeparture = differenceInCalendarDays(end, today);

  let stayStatus: { label: string; tone: "upcoming" | "active" | "past" };
  if (daysToDeparture < 0) stayStatus = { label: "Aufenthalt beendet", tone: "past" };
  else if (daysToArrival <= 0) stayStatus = { label: `Vor Ort · noch ${daysToDeparture} Tag${daysToDeparture === 1 ? "" : "e"}`, tone: "active" };
  else stayStatus = { label: `Noch ${daysToArrival} Tag${daysToArrival === 1 ? "" : "e"} bis Anreise`, tone: "upcoming" };

  const STATUS_STYLE = {
    upcoming: "bg-amber-400/20 text-amber-100",
    active: "bg-white/20 text-white",
    past: "bg-black/20 text-white/70",
  };

  const [copied, setCopied] = useState(false);
  function copyCode() {
    navigator.clipboard.writeText(booking.accessCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-green-700 to-green-800 text-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-bold text-lg">🏕️ Mein Stellplatz</h1>
              <p className="text-green-200 text-xs">{booking.guestName} · {booking.slotName}</p>
            </div>
            <a href="/mein-stellplatz" className="text-green-200 hover:text-white text-xs underline underline-offset-2">Abmelden</a>
          </div>
          <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${STATUS_STYLE[stayStatus.tone]}`}>
            {stayStatus.label}
          </span>
        </div>
      </header>

      {/* Tab-Navigation */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key ? "border-green-600 text-green-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* ÜBERSICHT */}
        {tab === "overview" && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Meine Buchung</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400 text-xs block">Stellplatz</span><span className="font-medium text-gray-900">{booking.slotName}</span></div>
                <div><span className="text-gray-400 text-xs block">Typ</span><span className="font-medium text-gray-900">{TYPE_LABEL[booking.slotType] || booking.slotType}</span></div>
                <div><span className="text-gray-400 text-xs block">Anreise</span><span className="font-medium text-gray-900">{fmt(booking.startDate)}</span></div>
                <div><span className="text-gray-400 text-xs block">Abreise</span><span className="font-medium text-gray-900">{fmt(booking.endDate)}</span></div>
                <div><span className="text-gray-400 text-xs block">Buchungsnr.</span><span className="font-mono font-medium text-gray-900">#{booking.id.slice(-8).toUpperCase()}</span></div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-green-700 font-medium mb-1">Dein Zugangscode</p>
                <p className="text-4xl font-bold text-green-800 tracking-widest">{booking.accessCode}</p>
                <p className="text-xs text-green-600 mt-2">Gib diesen Code am Eingang ein</p>
              </div>
              <button
                onClick={copyCode}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-green-200 hover:bg-green-100 text-green-700 transition-colors"
                title="Code kopieren"
              >
                {copied ? "✓" : "⧉"}
              </button>
            </div>
          </>
        )}

        {/* KAMERA */}
        {tab === "camera" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">📷</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Kamera-Überwachung</h2>
            <p className="text-gray-500 text-sm mb-6">Diese Funktion ist noch nicht verfügbar.</p>
            <div className="bg-gray-100 rounded-xl aspect-video flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">🔜</div>
                <p className="text-sm font-medium">Kamera wird bald eingebunden</p>
                <p className="text-xs mt-1">IP-Kamera oder Cloud-Kamera (Reolink, Hikvision)</p>
              </div>
            </div>
          </div>
        )}

        {/* STROM */}
        {tab === "power" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Stromverbrauch</h2>
            <p className="text-gray-500 text-sm mb-6">Diese Funktion ist noch nicht verfügbar.</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {["Heute", "Diese Woche", "Gesamt"].map(label => (
                <div key={label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                  <div className="text-2xl font-bold text-gray-300">–</div>
                  <div className="text-xs text-gray-400 mt-1">{label}</div>
                  <div className="text-xs text-gray-300">kWh</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">Wird verfügbar mit einem smarten Stromzähler (Shelly, Tasmota)</p>
          </div>
        )}

        {/* WARTUNG */}
        {tab === "maintenance" && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Neuen Eintrag hinzufügen</h2>
              <div className="space-y-3">
                <input value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="Titel (z.B. Ölwechsel fällig)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
                <textarea value={mDesc} onChange={e => setMDesc(e.target.value)} placeholder="Details (optional)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" rows={2} />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Fälligkeit (optional)</label>
                    <input type="date" value={mDue} onChange={e => setMDue(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={addMaintenance} disabled={mSaving || !mTitle}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm rounded-lg font-medium">
                      {mSaving ? "…" : "Hinzufügen"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {entries.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Noch keine Einträge</p>}
              {entries.map(e => (
                <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{e.title}</p>
                    {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                      <span>Erstellt: {fmt(e.createdAt)}</span>
                      {e.dueDate && <span className="text-amber-600">⏰ Fällig: {fmt(e.dueDate)}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteMaintenance(e.id)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* SERVICE */}
        {tab === "service" && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-1">Service anfragen</h2>
              <p className="text-xs text-gray-400 mb-4">Der Vermieter wird per E-Mail benachrichtigt und meldet sich bei dir.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Art der Anfrage</label>
                  <select value={sType} onChange={e => setSType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="CLEANING">🧹 Reinigung</option>
                    <option value="MAINTENANCE">🔧 Wartung / Reparatur</option>
                    <option value="OTHER">💬 Sonstiges</option>
                  </select>
                </div>
                <textarea value={sMsg} onChange={e => setSMsg(e.target.value)} placeholder="Beschreibe dein Anliegen…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" rows={4} />
                {sSent && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">✅ Anfrage gesendet! Der Vermieter meldet sich bei dir.</p>}
                <button onClick={sendServiceRequest} disabled={sSaving || !sMsg}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm rounded-lg font-semibold">
                  {sSaving ? "Wird gesendet…" : "Anfrage absenden"}
                </button>
              </div>
            </div>

            {requests.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Letzte Anfragen</h3>
                <div className="space-y-2">
                  {requests.map(r => (
                    <div key={r.id} className="flex items-start justify-between text-sm border-b border-gray-50 pb-2">
                      <div>
                        <span className="font-medium text-gray-700">{SERVICE_LABEL[r.type] || r.type}</span>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.message}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-3 shrink-0 ${r.status === "DONE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.status === "DONE" ? "Erledigt" : "Offen"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
