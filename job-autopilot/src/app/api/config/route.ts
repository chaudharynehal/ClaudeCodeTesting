import { NextResponse } from "next/server";
import { hasApiKey, MODEL } from "@/lib/anthropic";
import { emailConfigFromEnv } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    anthropic: hasApiKey(),
    model: MODEL,
    email: Boolean(emailConfigFromEnv()),
  });
}
