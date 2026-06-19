import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A status counts as "applied" once it has reached the apply stage or beyond.
const APPLIED = new Set(["applied", "waiting", "responded", "interview", "offer", "rejected"]);
const RESPONDED = new Set(["responded", "interview", "offer"]);
const INTERVIEWED = new Set(["interview", "offer"]);

function rate(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

export async function GET() {
  const apps = await prisma.application.findMany({
    include: { job: { select: { source: true } }, variant: { select: { label: true } } },
  });

  const byStatus: Record<string, number> = {};
  for (const a of apps) byStatus[a.status] = (byStatus[a.status] || 0) + 1;

  const applied = apps.filter((a) => APPLIED.has(a.status)).length;
  const responded = apps.filter((a) => RESPONDED.has(a.status)).length;
  const interviewed = apps.filter((a) => INTERVIEWED.has(a.status)).length;
  const offers = apps.filter((a) => a.status === "offer").length;

  // A/B by resume variant: response rate among applications that were applied.
  const variantMap = new Map<string, { label: string; applied: number; responded: number }>();
  for (const a of apps) {
    const label = a.variant?.label || "—";
    const key = a.variantId || "none";
    if (!variantMap.has(key)) variantMap.set(key, { label, applied: 0, responded: 0 });
    const v = variantMap.get(key)!;
    if (APPLIED.has(a.status)) v.applied++;
    if (RESPONDED.has(a.status)) v.responded++;
  }
  const byVariant = [...variantMap.values()]
    .filter((v) => v.applied > 0)
    .map((v) => ({ ...v, responseRate: rate(v.responded, v.applied) }))
    .sort((a, b) => b.responseRate - a.responseRate);

  // By source.
  const sourceMap = new Map<string, { applied: number; responded: number }>();
  for (const a of apps) {
    const key = a.job.source;
    if (!sourceMap.has(key)) sourceMap.set(key, { applied: 0, responded: 0 });
    const s = sourceMap.get(key)!;
    if (APPLIED.has(a.status)) s.applied++;
    if (RESPONDED.has(a.status)) s.responded++;
  }
  const bySource = [...sourceMap.entries()]
    .map(([source, s]) => ({ source, ...s, responseRate: rate(s.responded, s.applied) }))
    .sort((a, b) => b.applied - a.applied);

  return NextResponse.json({
    total: apps.length,
    byStatus,
    funnel: { applied, responded, interviewed, offers },
    rates: {
      responseRate: rate(responded, applied),
      interviewRate: rate(interviewed, applied),
      offerRate: rate(offers, applied),
    },
    byVariant,
    bySource,
  });
}
