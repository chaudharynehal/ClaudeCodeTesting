import type { RawJob } from "../types";
import { fetchJson, looksRemote, stripHtml, toDate } from "./util";

interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  content?: string; // HTML-escaped
}

// Public Greenhouse job board API. `token` is the board slug from
// boards.greenhouse.io/<token>.
export async function fetchGreenhouse(token: string, companyName: string): Promise<RawJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const data = await fetchJson<{ jobs?: GhJob[] }>(url);
  const company = companyName || token;
  return (data.jobs || []).map((j) => {
    const location = j.location?.name || "";
    return {
      source: "greenhouse",
      externalId: `${token}:${j.id}`,
      company,
      title: j.title,
      location,
      remote: looksRemote(location, j.title),
      url: j.absolute_url,
      description: stripHtml(j.content || ""),
      salary: "",
      postedAt: toDate(j.updated_at),
    } satisfies RawJob;
  });
}
