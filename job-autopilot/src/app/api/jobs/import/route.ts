import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";
import { scoreJob } from "@/lib/match";
import type { ProfileFilters, RawJob } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manual import — paste a LinkedIn/Indeed/company URL + the job description.
export async function POST(req: Request) {
  const body = await req.json();
  const company = String(body.company || "").trim();
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  if (!company || !title) {
    return NextResponse.json({ error: "Company and title are required." }, { status: 400 });
  }

  const url = String(body.url || "").trim();
  const job: RawJob = {
    source: "manual",
    externalId: url || `manual:${Date.now()}`,
    company,
    title,
    location: String(body.location || "").trim(),
    remote: Boolean(body.remote),
    url,
    description,
    salary: String(body.salary || "").trim(),
    postedAt: new Date(),
  };

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
  const { score, reasons } = scoreJob(job, filters);

  const saved = await prisma.job.upsert({
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
      company: job.company,
      title: job.title,
      location: job.location,
      remote: job.remote,
      description: job.description,
      salary: job.salary,
      matchScore: score,
      matchReasons: JSON.stringify(reasons),
    },
  });

  return NextResponse.json({ job: saved });
}
