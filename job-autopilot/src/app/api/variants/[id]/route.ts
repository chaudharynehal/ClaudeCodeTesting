import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.label === "string") data.label = body.label;
  if (typeof body.content === "string") data.content = body.content;
  const variant = await prisma.resumeVariant.update({ where: { id: params.id }, data });
  return NextResponse.json({ variant });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const variant = await prisma.resumeVariant.findUnique({ where: { id: params.id } });
  if (variant?.isDefault) {
    return NextResponse.json({ error: "Cannot delete the default variant." }, { status: 400 });
  }
  await prisma.resumeVariant.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
