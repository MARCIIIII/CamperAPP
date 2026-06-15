"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/slots",     label: "Stellplätze", icon: "🅿️" },
  { href: "/admin/bookings",  label: "Buchungen",   icon: "📋" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  return (
    <nav className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-4 shrink-0">
      <div className="mb-8">
        <span className="text-lg font-bold text-white">🏕️ Admin</span>
        <span className="block text-xs text-gray-500 mt-0.5">CamperSlot</span>
      </div>

      <ul className="space-y-1 flex-1">
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-green-700 text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="border-t border-gray-800 pt-4 space-y-2">
        <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800">
          ← Zur Website
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-800"
        >
          🚪 Ausloggen
        </button>
      </div>
    </nav>
  );
}
