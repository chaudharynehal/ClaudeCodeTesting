// Shared types used across connectors, matching, and the UI.

export type SourceType =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "remoteok"
  | "weworkremotely"
  | "manual";

// Normalized shape every connector returns.
export interface RawJob {
  source: SourceType;
  externalId: string;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  salary: string;
  postedAt: Date | null;
}

export interface MatchResult {
  score: number; // 0-100
  reasons: string[];
}

export interface ProfileFilters {
  targetRoles: string[];
  locations: string[];
  remoteOnly: boolean;
  minSalary: number | null;
  keywords: string[];
  excludeKeywords: string[];
  seniority: string;
}

export const STATUSES = [
  "matched",
  "queued",
  "applied",
  "waiting",
  "responded",
  "interview",
  "offer",
  "rejected",
  "archived",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  matched: "Matched",
  queued: "Queued",
  applied: "Applied",
  waiting: "Waiting",
  responded: "Responded",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Archived",
};

// Statuses shown as columns on the pipeline board (archived is hidden there).
export const PIPELINE_STATUSES: Status[] = [
  "matched",
  "queued",
  "applied",
  "waiting",
  "responded",
  "interview",
  "offer",
  "rejected",
];
