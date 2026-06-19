import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";
import { scoreJob } from "@/lib/match";
import { fetchAllJobs, type SourceSpec } from "@/lib/sources";
import type { ProfileFilters } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  const profile = await prisma.profile.findUnique({ where: { id: 1 } });
  const filters: ProfileFilters = {
    targetRoles: parseList(profile?.targetRoles),
    locations: parseList(profile?.locations),
    remoteOnly: Boolean(profile?.remoteOnly),
    minSalary: profile?.minSalary ?? null,
    keywords: parseList(profile?.keywords),
    excludeKeywords: parseList(profile?.excludeKeywords),
    seniority: profile?.seniority ?? "",
  };

  const sourceRows = await prisma.companySource.findMany({ where: { enabled: true } });
  const companySources: SourceSpec[] = sourceRows
    .filter((s) => s.type === "greenhouse" || s.type === "lever" || s.type === "ashby")
    .map((s) => ({ type: s.type as SourceSpec["type"], token: s.token, name: s.name }));

  const report = await fetchAllJobs({ companySources, includeRemoteBoards: true });

  let created = 0;
  let updated = 0;
  for (const job of report.jobs) {
    const { score, reasons } = scoreJob(job, filters);
    try {
      const result = await prisma.job.upsert({
        where: { source_externalId: { source: job.source, externalId: job.externalId } },
        create: {
          source: job.source,
          externalId: job.externalId,
          company: job.company,
          title: job.title,
          location: job.location,
          remote: job.remote,
          url: job.url,
          description: job.description,
          salary: job.salary,
          postedAt: job.postedAt,
          matchScore: score,
          matchReasons: JSON.stringify(reasons),
        },
        update: {
          title: job.title,
          location: job.location,
          remote: job.remote,
          url: job.url,
          description: job.description,
          salary: job.salary,
          postedAt: job.postedAt,
          matchScore: score,
          matchReasons: JSON.stringify(reasons),
          fetchedAt: new Date(),
        },
        select: { createdAt: true, fetchedAt: true },
      });
      // Heuristic: createdAt == fetchedAt only on first insert.
      if (Math.abs(result.createdAt.getTime() - result.fetchedAt.getTime()) < 1000) created++;
      else updated++;
    } catch {
      // Skip a single bad row.
    }
  }

  return NextResponse.json({
    fetched: report.fetched,
    created,
    updated,
    errors: report.errors,
  });
}
