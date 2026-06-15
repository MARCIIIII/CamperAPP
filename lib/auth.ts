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
