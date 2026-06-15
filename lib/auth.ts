import { createHash } from "crypto";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + "camperslot-salt").digest("hex");
}

export function makeAdminToken(): string {
  return hashPassword(process.env.ADMIN_PASSWORD || "");
}

export const ADMIN_COOKIE = "camperslot_admin";
export const CUSTOMER_COOKIE = "camperslot_customer";
