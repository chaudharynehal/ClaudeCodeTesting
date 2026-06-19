import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

export interface TailorInput {
  fullName: string;
  contact: string; // email / phone / links, one line
  baseResume: string;
  baseCoverLetter: string;
  company: string;
  title: string;
  location: string;
  jobDescription: string;
}

export interface TailorOutput {
  tailoredResume: string;
  tailoredCoverLetter: string;
  fitSummary: string;
  matchHighlights: string[];
  suggestedTweaks: string[];
}

const SYSTEM = `You are an expert career coach and resume writer. You tailor a candidate's
EXISTING resume and cover letter to a specific job posting.

Hard rules:
- Never fabricate experience, employers, dates, degrees, or metrics. Only
  rephrase, reorder, and re-emphasize what is already in the candidate's
  material. If the base resume lacks something the job wants, do NOT invent it;
  instead list it under suggestedTweaks for the human to consider.
- Mirror the job's terminology where it honestly applies to the candidate.
- Keep the resume realistic in length and ATS-friendly (clean headers, plain
  bullet points, no tables/columns).
- The cover letter must be specific to the company and role, ~3 short paragraphs.

Respond with ONLY a single JSON object (no markdown fences, no prose) of shape:
{
  "tailoredResume": string,        // full tailored resume, markdown
  "tailoredCoverLetter": string,   // full cover letter, plain text
  "fitSummary": string,            // 2-3 sentences on overall fit
  "matchHighlights": string[],     // why the candidate fits (from real experience)
  "suggestedTweaks": string[]      // honest gaps / things to add or clarify
}`;

function extractText(message: { content: Array<{ type: string; text?: string }> }): string {
  return message.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}

// Best-effort JSON extraction (handles stray fences / prose just in case).
function parseJson(raw: string): TailorOutput {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  const obj = JSON.parse(text) as Partial<TailorOutput>;
  return {
    tailoredResume: obj.tailoredResume ?? "",
    tailoredCoverLetter: obj.tailoredCoverLetter ?? "",
    fitSummary: obj.fitSummary ?? "",
    matchHighlights: Array.isArray(obj.matchHighlights) ? obj.matchHighlights : [],
    suggestedTweaks: Array.isArray(obj.suggestedTweaks) ? obj.suggestedTweaks : [],
  };
}

export async function tailorApplication(input: TailorInput): Promise<TailorOutput> {
  const userPrompt = `CANDIDATE
Name: ${input.fullName || "(not provided)"}
Contact: ${input.contact || "(not provided)"}

BASE RESUME
"""
${input.baseResume || "(empty)"}
"""

BASE COVER LETTER (template / tone reference)
"""
${input.baseCoverLetter || "(none provided — write one from scratch using only the resume)"}
"""

TARGET JOB
Company: ${input.company}
Title: ${input.title}
Location: ${input.location || "(not specified)"}
Description:
"""
${input.jobDescription.slice(0, 12000)}
"""

Tailor the resume and cover letter for this specific role. Return the JSON object only.`;

  // Adaptive thinking improves tailoring quality; cast the params so the call
  // compiles across SDK minor versions that may type these fields differently.
  const params = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming;

  const message = await getClient().messages.create(params);
  return parseJson(extractText(message as unknown as { content: Array<{ type: string; text?: string }> }));
}
