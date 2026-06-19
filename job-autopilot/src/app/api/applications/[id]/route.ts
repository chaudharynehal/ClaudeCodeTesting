import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      job: true,
      variant: true,
      interviews: { orderBy: { createdAt: "asc" } },
      emailEvents: { orderBy: { receivedAt: "desc" } },
    },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    application: {
      ...application,
      matchHighlights: parseList(application.matchHighlights),
      suggestedTweaks: parseList(application.suggestedTweaks),
      job: { ...application.job, matchReasons: parseList(application.job.matchReasons) },
    },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    data.status = body.status;
    // First time it moves to "applied", stamp the date automatically.
    if (body.status === "applied") {
      const existing = await prisma.application.findUnique({ where: { id: params.id } });
      if (existing && !existing.appliedAt) data.appliedAt = new Date();
    }
  }
  if (typeof body.notes === "string") data.notes = body.notes;
  if (typeof body.offerSalary === "string") data.offerSalary = body.offerSalary;
  if (typeof body.variantId === "string") data.variantId = body.variantId;
  if (typeof body.tailoredResume === "string") data.tailoredResume = body.tailoredResume;
  if (typeof body.tailoredCoverLetter === "string") data.tailoredCoverLetter = body.tailoredCoverLetter;
  if (body.appliedAt) data.appliedAt = new Date(body.appliedAt);

  const application = await prisma.application.update({ where: { id: params.id }, data });
  return NextResponse.json({ application });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.application.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
