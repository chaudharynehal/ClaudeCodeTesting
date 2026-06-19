import type { RawJob } from "../types";
import { fetchJson, looksRemote, stripHtml, toDate } from "./util";

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  isRemote?: boolean;
  jobUrl?: string;
  applyUrl?: string;
  publishedAt?: string;
  employmentType?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  compensation?: { compensationTierSummary?: string };
}

// Public Ashby job board API. `board` is the board name from
// jobs.ashbyhq.com/<board>.
export async function fetchAshby(board: string, companyName: string): Promise<RawJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`;
  const data = await fetchJson<{ jobs?: AshbyJob[] }>(url);
  const company = companyName || board;
  return (data.jobs || []).map((j) => {
    const location = j.location || "";
    return {
      source: "ashby",
      externalId: `${board}:${j.id}`,
      company,
      title: j.title,
      location,
      remote: Boolean(j.isRemote) || looksRemote(location),
      url: j.jobUrl || j.applyUrl || "",
      description: j.descriptionPlain || stripHtml(j.descriptionHtml || ""),
      salary: j.compensation?.compensationTierSummary || "",
      postedAt: toDate(j.publishedAt),
    } satisfies RawJob;
  });
}
