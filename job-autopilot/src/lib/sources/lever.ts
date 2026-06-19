import type { RawJob } from "../types";
import { fetchJson, looksRemote, stripHtml, toDate } from "./util";

interface LeverPosting {
  id: string;
  text: string; // title
  hostedUrl: string;
  createdAt?: number;
  descriptionPlain?: string;
  description?: string;
  categories?: { location?: string; team?: string; commitment?: string };
}

// Public Lever postings API. `token` is the company slug from jobs.lever.co/<token>.
export async function fetchLever(token: string, companyName: string): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`;
  const data = await fetchJson<LeverPosting[]>(url);
  const company = companyName || token;
  return (data || []).map((p) => {
    const location = p.categories?.location || "";
    return {
      source: "lever",
      externalId: `${token}:${p.id}`,
      company,
      title: p.text,
      location,
      remote: looksRemote(location, p.categories?.commitment || ""),
      url: p.hostedUrl,
      description: p.descriptionPlain || stripHtml(p.description || ""),
      salary: "",
      postedAt: toDate(p.createdAt),
    } satisfies RawJob;
  });
}
