import type { RawJob } from "../types";
import { fetchJson, stripHtml, toDate } from "./util";

interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  description?: string;
  date?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
}

// RemoteOK public feed. The first array element is a legal/metadata notice.
export async function fetchRemoteOk(): Promise<RawJob[]> {
  const data = await fetchJson<RemoteOkJob[]>("https://remoteok.com/api");
  const jobs = (data || []).filter((j) => j.position && j.company);
  return jobs.map((j) => {
    const salary =
      j.salary_min && j.salary_max ? `$${j.salary_min}–$${j.salary_max}` : "";
    return {
      source: "remoteok",
      externalId: `remoteok:${j.id ?? j.slug}`,
      company: j.company || "",
      title: j.position || "",
      location: j.location || "Remote",
      remote: true,
      url: j.url || `https://remoteok.com/remote-jobs/${j.slug ?? ""}`,
      description: `${(j.tags || []).join(", ")}\n\n${stripHtml(j.description || "")}`.trim(),
      salary,
      postedAt: toDate(j.date),
    } satisfies RawJob;
  });
}
