import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { makeAdminToken, ADMIN_COOKIE } from "@/lib/auth";

async function checkAdmin() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  return token === await makeAdminToken();
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const slot = await prisma.slot.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(slot);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.slot.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
