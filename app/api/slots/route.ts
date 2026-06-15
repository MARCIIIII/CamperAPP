import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const slots = await prisma.slot.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const auth = req.headers.get("x-admin-password");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, type, description, pricePerDay, pricePerMonth, accessCode } = body;

  if (!name || !type || !pricePerDay || !pricePerMonth || !accessCode) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const slot = await prisma.slot.create({
    data: { name, type, description, pricePerDay, pricePerMonth, accessCode },
  });

  return NextResponse.json(slot, { status: 201 });
}
