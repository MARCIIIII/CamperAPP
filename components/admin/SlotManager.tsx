"use client";

import { useState } from "react";

type Slot = {
  id: string; name: string; type: string; description: string | null;
  pricePerDay: number; pricePerMonth: number; accessCode: string; isActive: boolean;
};

const EMPTY: Omit<Slot, "id" | "isActive"> = {
  name: "", type: "CAMPER", description: "", pricePerDay: 0, pricePerMonth: 0, accessCode: "",
};

export default function SlotManager({ initialSlots }: { initialSlots: Slot[] }) {
  const [slots, setSlots] = useState(initialSlots);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  function openNew() { setForm({ ...EMPTY }); setEditing(null); setShowForm(true); }
  function openEdit(s: Slot) { setForm({ name: s.name, type: s.type, description: s.description || "", pricePerDay: s.pricePerDay, pricePerMonth: s.pricePerMonth, accessCode: s.accessCode }); setEditing(s); setShowForm(true); }

  async function handleSave() {
    setSaving(true);
    if (editing) {
      const res = await fetch(`/api/admin/slots/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = await res.json();
        setSlots(slots.map(s => s.id === editing.id ? updated : s));
      }
    } else {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": "" },
        body: JSON.stringify(form),
      });
      if (res.ok) { const s = await res.json(); setSlots([...slots, s]); }
    }
    setSaving(false); setShowForm(false);
  }

  async function handleToggle(slot: Slot) {
    const res = await fetch(`/api/admin/slots/${slot.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !slot.isActive }),
    });
    if (res.ok) { const updated = await res.json(); setSlots(slots.map(s => s.id === slot.id ? updated : s)); }
  }

  const TYPE_LABEL: Record<string, string> = { CAMPER: "🚐 Camper", CARAVAN: "🚌 Wohnwagen", GARAGE: "🏠 Garage" };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">
          + Neuer Stellplatz
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-white">{editing ? "Stellplatz bearbeiten" : "Neuer Stellplatz"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Stellplatz A1" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Typ</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="CAMPER">🚐 Camper</option>
                <option value="CARAVAN">🚌 Wohnwagen</option>
                <option value="GARAGE">🏠 Garage</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Preis / Tag (€)</label>
              <input type="number" value={form.pricePerDay} onChange={e => setForm({ ...form, pricePerDay: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Preis / Monat (€)</label>
              <input type="number" value={form.pricePerMonth} onChange={e => setForm({ ...form, pricePerMonth: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Zugangscode</label>
              <input value={form.accessCode} onChange={e => setForm({ ...form, accessCode: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="1234" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Beschreibung</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
              {saving ? "Speichert…" : "Speichern"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg border border-gray-700">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Slot-Tabelle */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800">
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Typ</th>
              <th className="text-left px-5 py-3">Preis/Tag</th>
              <th className="text-left px-5 py-3">Preis/Monat</th>
              <th className="text-left px-5 py-3">Code</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id} className={`border-b border-gray-800/50 ${!s.isActive ? "opacity-50" : ""}`}>
                <td className="px-5 py-3 text-white font-medium">{s.name}</td>
                <td className="px-5 py-3 text-gray-400">{TYPE_LABEL[s.type] || s.type}</td>
                <td className="px-5 py-3 text-gray-400">{s.pricePerDay.toFixed(2)} €</td>
                <td className="px-5 py-3 text-gray-400">{s.pricePerMonth.toFixed(2)} €</td>
                <td className="px-5 py-3 font-mono text-green-400">{s.accessCode}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>
                    {s.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(s)} className="text-xs text-blue-400 hover:text-blue-300">Bearbeiten</button>
                  <button onClick={() => handleToggle(s)} className="text-xs text-gray-400 hover:text-white">
                    {s.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
