import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  if (!bookingId) return NextResponse.json({ error: "bookingId fehlt" }, { status: 400 });

  const entries = await prisma.maintenanceEntry.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const { bookingId, title, description, dueDate } = await req.json();
  if (!bookingId || !title) return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });

  const entry = await prisma.maintenanceEntry.create({
    data: { bookingId, title, description, dueDate: dueDate ? new Date(dueDate) : null },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  await prisma.maintenanceEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
