import type { RawJob } from "../types";
import { fetchGreenhouse } from "./greenhouse";
import { fetchLever } from "./lever";
import { fetchAshby } from "./ashby";
import { fetchRemoteOk } from "./remoteok";
import { fetchWeWorkRemotely } from "./weworkremotely";

export interface SourceSpec {
  type: "greenhouse" | "lever" | "ashby";
  token: string;
  name: string;
}

export interface FetchReport {
  fetched: number;
  errors: { source: string; message: string }[];
  jobs: RawJob[];
}

interface FetchOptions {
  companySources: SourceSpec[];
  includeRemoteBoards: boolean;
}

// Pull from every configured ATS board plus the remote boards, in parallel.
// One failing source never blocks the rest.
export async function fetchAllJobs(opts: FetchOptions): Promise<FetchReport> {
  const errors: FetchReport["errors"] = [];
  const tasks: Promise<RawJob[]>[] = [];

  for (const s of opts.companySources) {
    const label = `${s.type}:${s.token}`;
    const task = (async () => {
      try {
        if (s.type === "greenhouse") return await fetchGreenhouse(s.token, s.name);
        if (s.type === "lever") return await fetchLever(s.token, s.name);
        if (s.type === "ashby") return await fetchAshby(s.token, s.name);
        return [];
      } catch (e) {
        errors.push({ source: label, message: (e as Error).message });
        return [];
      }
    })();
    tasks.push(task);
  }

  if (opts.includeRemoteBoards) {
    tasks.push(
      (async () => {
        try {
          return await fetchRemoteOk();
        } catch (e) {
          errors.push({ source: "remoteok", message: (e as Error).message });
          return [];
        }
      })(),
    );
    tasks.push(
      (async () => {
        try {
          return await fetchWeWorkRemotely();
        } catch (e) {
          errors.push({ source: "weworkremotely", message: (e as Error).message });
          return [];
        }
      })(),
    );
  }

  const results = await Promise.all(tasks);
  const jobs = results.flat().filter((j) => j.title && j.company);
  return { fetched: jobs.length, errors, jobs };
}
