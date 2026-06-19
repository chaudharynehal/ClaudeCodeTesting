import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// All applications for the pipeline board.
export async function GET() {
  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      job: { select: { company: true, title: true, location: true, url: true, matchScore: true, source: true } },
      variant: { select: { label: true } },
      _count: { select: { interviews: true } },
    },
  });
  return NextResponse.json({ applications });
}

// Add a job to the pipeline without tailoring (e.g. "Queue").
export async function POST(req: Request) {
  const body = await req.json();
  const jobId = String(body.jobId || "");
  const status = String(body.status || "queued");
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const application = await prisma.application.upsert({
    where: { jobId },
    create: { jobId, status },
    update: { status },
  });
  return NextResponse.json({ application });
}
