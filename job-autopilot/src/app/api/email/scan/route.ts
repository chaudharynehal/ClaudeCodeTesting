import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  classify,
  emailConfigFromEnv,
  matchesCompany,
  scanInbox,
  type Classification,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// How much each classification "advances" the pipeline.
const RANK: Record<string, number> = {
  applied: 1,
  waiting: 1,
  responded: 2,
  interview: 3,
  offer: 4,
  rejected: 5,
};

function nextStatus(current: string, c: Classification): string | null {
  if (c === "rejection") return current === "offer" ? null : "rejected";
  if (c === "offer") return "offer";
  if (c === "interview") return RANK[current] < RANK["interview"] ? "interview" : null;
  if (c === "response") return RANK[current] < RANK["responded"] ? "responded" : null;
  return null;
}

export async function GET() {
  const events = await prisma.emailEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: 50,
    include: { application: { include: { job: { select: { company: true } } } } },
  });
  return NextResponse.json({ configured: Boolean(emailConfigFromEnv()), events });
}

export async function POST() {
  const cfg = emailConfigFromEnv();
  if (!cfg) {
    return NextResponse.json(
      { error: "IMAP is not configured. Set IMAP_HOST/PORT/USER/PASSWORD in .env." },
      { status: 400 },
    );
  }

  let emails;
  try {
    emails = await scanInbox(cfg);
  } catch (e) {
    return NextResponse.json({ error: `Inbox scan failed: ${(e as Error).message}` }, { status: 500 });
  }

  const applications = await prisma.application.findMany({
    where: { status: { notIn: ["archived"] } },
    include: { job: { select: { company: true } } },
  });

  const updates: { company: string; classification: string; status: string | null }[] = [];
  let matched = 0;

  for (const app of applications) {
    const company = app.job.company;
    const hits = emails.filter((e) => matchesCompany(e, company));
    for (const email of hits) {
      const c = classify(email.subject);
      if (c === "other") continue;

      const exists = await prisma.emailEvent.findFirst({
        where: { applicationId: app.id, subject: email.subject },
      });
      if (exists) continue;

      matched++;
      await prisma.emailEvent.create({
        data: {
          applicationId: app.id,
          fromAddr: email.fromAddr,
          subject: email.subject,
          snippet: email.subject,
          classification: c,
          receivedAt: email.receivedAt,
        },
      });

      const ns = nextStatus(app.status, c);
      if (ns && ns !== app.status) {
        await prisma.application.update({ where: { id: app.id }, data: { status: ns } });
        updates.push({ company, classification: c, status: ns });
      }
    }
  }

  return NextResponse.json({ scanned: emails.length, matched, updates });
}
