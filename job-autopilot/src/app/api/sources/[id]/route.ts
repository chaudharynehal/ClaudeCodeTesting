import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const source = await prisma.companySource.update({
    where: { id: Number(params.id) },
    data: { enabled: Boolean(body.enabled) },
  });
  return NextResponse.json({ source });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.companySource.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
