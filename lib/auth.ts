import { cookies } from "next/headers";

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeAdminToken(): Promise<string> {
  return sha256hex((process.env.ADMIN_PASSWORD || "") + "camperslot-salt");
}

export const ADMIN_COOKIE = "camperslot_admin";
export const CUSTOMER_COOKIE = "camperslot_customer";

// Server-only (uses next/headers) — safe for Route Handlers and Server
// Components, but must NOT be imported from proxy.ts (Edge runtime has its
// own inlined copy of makeAdminToken for that reason).
export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === (await makeAdminToken());
}

// Secret used to sign customer session tokens. Falls back to ADMIN_PASSWORD
// since that's the only server-side secret currently configured.
function customerSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

export async function makeCustomerToken(bookingId: string): Promise<string> {
  return sha256hex(bookingId + customerSecret() + "camperslot-customer-salt");
}

export async function verifyCustomerSession(bookingId: string): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(CUSTOMER_COOKIE)?.value;
  if (!raw) return false;
  const [id, token] = raw.split(":");
  if (id !== bookingId || !token) return false;
  return token === (await makeCustomerToken(bookingId));
}
