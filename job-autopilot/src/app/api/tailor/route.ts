import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasApiKey, tailorApplication } from "@/lib/anthropic";
import { parseObject } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env to enable tailoring." },
      { status: 400 },
    );
  }

  const body = await req.json();
  const jobId = String(body.jobId || "");
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const profile = await prisma.profile.findUnique({ where: { id: 1 } });

  // Pick the requested resume variant, else the default, else any.
  let variant = body.variantId
    ? await prisma.resumeVariant.findUnique({ where: { id: String(body.variantId) } })
    : null;
  if (!variant) variant = await prisma.resumeVariant.findFirst({ where: { isDefault: true } });
  if (!variant) variant = await prisma.resumeVariant.findFirst();
  if (!variant || !variant.content.trim()) {
    return NextResponse.json(
      { error: "Add your resume in Onboarding before tailoring." },
      { status: 400 },
    );
  }

  const links = parseObject(profile?.links, {} as Record<string, string>);
  const contact = [profile?.email, profile?.phone, ...Object.values(links)]
    .filter(Boolean)
    .join(" · ");

  let result;
  try {
    result = await tailorApplication({
      fullName: profile?.fullName || "",
      contact,
      baseResume: variant.content,
      baseCoverLetter: profile?.coverLetterText || "",
      company: job.company,
      title: job.title,
      location: job.location,
      jobDescription: job.description,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Tailoring failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  const application = await prisma.application.upsert({
    where: { jobId: job.id },
    create: {
      jobId: job.id,
      status: "matched",
      variantId: variant.id,
      tailoredResume: result.tailoredResume,
      tailoredCoverLetter: result.tailoredCoverLetter,
      fitSummary: result.fitSummary,
      matchHighlights: JSON.stringify(result.matchHighlights),
      suggestedTweaks: JSON.stringify(result.suggestedTweaks),
    },
    update: {
      variantId: variant.id,
      tailoredResume: result.tailoredResume,
      tailoredCoverLetter: result.tailoredCoverLetter,
      fitSummary: result.fitSummary,
      matchHighlights: JSON.stringify(result.matchHighlights),
      suggestedTweaks: JSON.stringify(result.suggestedTweaks),
    },
  });

  return NextResponse.json({ application });
}
