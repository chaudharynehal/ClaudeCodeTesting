import Parser from "rss-parser";
import type { RawJob } from "../types";
import { stripHtml } from "./util";

const FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
  "https://weworkremotely.com/categories/remote-product-jobs.rss",
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
];

const parser = new Parser({ headers: { "User-Agent": "JobPilot/0.1 (+local)" } });

// WeWorkRemotely publishes RSS feeds per category. Titles are usually
// "Company: Role".
export async function fetchWeWorkRemotely(): Promise<RawJob[]> {
  const out: RawJob[] = [];
  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed);
      for (const item of parsed.items || []) {
        const rawTitle = item.title || "";
        const [companyPart, ...rest] = rawTitle.split(":");
        const title = rest.length ? rest.join(":").trim() : rawTitle.trim();
        const company = rest.length ? companyPart.trim() : "WeWorkRemotely";
        out.push({
          source: "weworkremotely",
          externalId: `wwr:${item.guid || item.link || rawTitle}`,
          company,
          title,
          location: "Remote",
          remote: true,
          url: item.link || "",
          description: stripHtml(item.contentSnippet || item.content || ""),
          salary: "",
          postedAt: item.isoDate ? new Date(item.isoDate) : null,
        });
      }
    } catch {
      // Skip a feed that fails; keep the others.
    }
  }
  return out;
}
