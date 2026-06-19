import type { MatchResult, ProfileFilters, RawJob } from "./types";

function norm(s: string): string {
  return s.toLowerCase();
}

// Deterministic 0-100 match score. No API calls — fast and free, so we can
// score every fetched job. The AI "Tailor" step is where the LLM gets used.
export function scoreJob(job: RawJob, f: ProfileFilters): MatchResult {
  const reasons: string[] = [];
  const title = norm(job.title);
  const haystack = norm(`${job.title} ${job.description}`);

  let score = 0;

  // Target role match (most important): up to 45 pts.
  if (f.targetRoles.length) {
    const titleHit = f.targetRoles.find((r) => r && title.includes(norm(r)));
    const bodyHit = f.targetRoles.find((r) => r && haystack.includes(norm(r)));
    if (titleHit) {
      score += 45;
      reasons.push(`Title matches target role "${titleHit}"`);
    } else if (bodyHit) {
      score += 22;
      reasons.push(`Mentions target role "${bodyHit}"`);
    }
  } else {
    score += 20; // no role filter set — give everything a baseline
  }

  // Keyword/skill coverage: up to 30 pts.
  if (f.keywords.length) {
    const hits = f.keywords.filter((k) => k && haystack.includes(norm(k)));
    if (hits.length) {
      score += Math.min(30, hits.length * 8);
      reasons.push(`Skills present: ${hits.slice(0, 6).join(", ")}`);
    }
  }

  // Location / remote: up to 20 pts.
  if (f.remoteOnly) {
    if (job.remote || norm(job.location).includes("remote")) {
      score += 20;
      reasons.push("Remote role");
    } else {
      score -= 25;
      reasons.push("Not remote (you set remote-only)");
    }
  } else if (f.locations.length) {
    const locHit = f.locations.find(
      (l) => l && norm(job.location).includes(norm(l)),
    );
    if (locHit) {
      score += 20;
      reasons.push(`Location matches "${locHit}"`);
    } else if (job.remote) {
      score += 10;
      reasons.push("Remote-friendly");
    }
  } else {
    score += 10;
  }

  // Seniority hint: up to 5 pts.
  if (f.seniority && title.includes(norm(f.seniority))) {
    score += 5;
    reasons.push(`Seniority "${f.seniority}" matches`);
  }

  // Exclusions: hard penalty.
  const excluded = f.excludeKeywords.find((k) => k && haystack.includes(norm(k)));
  if (excluded) {
    score -= 40;
    reasons.push(`Contains excluded term "${excluded}"`);
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}
