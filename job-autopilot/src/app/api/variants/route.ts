import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const variants = await prisma.resumeVariant.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ variants });
}

export async function POST(req: Request) {
  const body = await req.json();
  const variant = await prisma.resumeVariant.create({
    data: {
      label: String(body.label || "Untitled variant"),
      content: String(body.content || ""),
      isDefault: false,
    },
  });
  return NextResponse.json({ variant });
}
