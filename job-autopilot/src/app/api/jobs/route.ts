import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List jobs for the "Matches" view. Defaults to highest match score first and
// hides jobs you've already added to the pipeline.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const minScore = Number(url.searchParams.get("minScore") || 0);
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const includeApplied = url.searchParams.get("includeApplied") === "1";

  const jobs = await prisma.job.findMany({
    where: {
      hidden: false,
      matchScore: { gte: minScore },
      ...(includeApplied ? {} : { application: null }),
    },
    orderBy: [{ matchScore: "desc" }, { fetchedAt: "desc" }],
    take: 300,
    include: { application: { select: { id: true, status: true } } },
  });

  const filtered = q
    ? jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q),
      )
    : jobs;

  return NextResponse.json({
    jobs: filtered.map((j) => ({ ...j, matchReasons: parseList(j.matchReasons) })),
  });
}
