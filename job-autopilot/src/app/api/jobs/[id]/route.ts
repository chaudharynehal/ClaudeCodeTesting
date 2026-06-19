import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job: { ...job, matchReasons: parseList(job.matchReasons) } });
}

// Hide a job from the matches list ("not interested").
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const job = await prisma.job.update({
    where: { id: params.id },
    data: { hidden: Boolean(body.hidden) },
  });
  return NextResponse.json({ job });
}
