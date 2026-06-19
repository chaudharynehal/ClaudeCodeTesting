import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const applicationId = String(body.applicationId || "");
  if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  const interview = await prisma.interview.create({
    data: {
      applicationId,
      round: String(body.round || "Interview"),
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      notes: String(body.notes || ""),
      outcome: String(body.outcome || "pending"),
    },
  });
  return NextResponse.json({ interview });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (typeof body.round === "string") data.round = body.round;
  if (typeof body.notes === "string") data.notes = body.notes;
  if (typeof body.outcome === "string") data.outcome = body.outcome;
  if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
  const interview = await prisma.interview.update({ where: { id }, data });
  return NextResponse.json({ interview });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.interview.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
