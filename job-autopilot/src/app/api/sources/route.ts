import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set(["greenhouse", "lever", "ashby"]);

export async function GET() {
  const sources = await prisma.companySource.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ sources });
}

export async function POST(req: Request) {
  const body = await req.json();
  const type = String(body.type || "").toLowerCase();
  const token = String(body.token || "").trim();
  if (!VALID.has(type) || !token) {
    return NextResponse.json({ error: "Provide a valid type (greenhouse|lever|ashby) and token." }, { status: 400 });
  }
  try {
    const source = await prisma.companySource.create({
      data: { type, token, name: String(body.name || ""), enabled: true },
    });
    return NextResponse.json({ source });
  } catch {
    return NextResponse.json({ error: "That source already exists." }, { status: 409 });
  }
}
