import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseList, parseObject, stringify } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureProfile() {
  return prisma.profile.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

async function ensureDefaultVariant() {
  let variant = await prisma.resumeVariant.findFirst({ where: { isDefault: true } });
  if (!variant) {
    variant = await prisma.resumeVariant.create({
      data: { label: "Default", content: "", isDefault: true },
    });
  }
  return variant;
}

export async function GET() {
  const profile = await ensureProfile();
  const defaultVariant = await ensureDefaultVariant();
  return NextResponse.json({
    profile: {
      ...profile,
      links: parseObject(profile.links, {} as Record<string, string>),
      targetRoles: parseList(profile.targetRoles),
      locations: parseList(profile.locations),
      keywords: parseList(profile.keywords),
      excludeKeywords: parseList(profile.excludeKeywords),
    },
    defaultResume: defaultVariant.content,
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  await ensureProfile();

  await prisma.profile.update({
    where: { id: 1 },
    data: {
      fullName: String(body.fullName ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      location: String(body.location ?? ""),
      links: stringify(body.links ?? {}),
      coverLetterText: String(body.coverLetterText ?? ""),
      targetRoles: stringify(body.targetRoles ?? []),
      locations: stringify(body.locations ?? []),
      remoteOnly: Boolean(body.remoteOnly),
      minSalary: body.minSalary ? Number(body.minSalary) : null,
      keywords: stringify(body.keywords ?? []),
      excludeKeywords: stringify(body.excludeKeywords ?? []),
      seniority: String(body.seniority ?? ""),
    },
  });

  if (typeof body.defaultResume === "string") {
    const variant = await ensureDefaultVariant();
    await prisma.resumeVariant.update({
      where: { id: variant.id },
      data: { content: body.defaultResume },
    });
  }

  return NextResponse.json({ ok: true });
}
