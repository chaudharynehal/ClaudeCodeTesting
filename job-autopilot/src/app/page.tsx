"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getJSON, scoreColor, send } from "@/lib/client";
import { PIPELINE_STATUSES, STATUS_LABELS, STATUSES, type Status } from "@/lib/types";
import { Banner, StatusBadge } from "@/components/ui";

interface AppRow {
  id: string;
  status: string;
  variant?: { label: string } | null;
  _count: { interviews: number };
  job: { company: string; title: string; location: string; url: string; matchScore: number; source: string };
}

export default function PipelinePage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getJSON<{ applications: AppRow[] }>("/api/applications");
      setApps(data.applications);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function fetchJobs() {
    setFetching(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await send<{ created: number; updated: number; fetched: number; errors: { source: string }[] }>(
        "/api/jobs/fetch",
        "POST",
      );
      const errNote = r.errors.length ? ` (${r.errors.length} source(s) failed)` : "";
      setMsg(`Fetched ${r.fetched} postings — ${r.created} new, ${r.updated} refreshed${errNote}. See them under Matches.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setFetching(false);
    }
  }

  async function move(id: string, status: string) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await send(`/api/applications/${id}`, "PATCH", { status });
    } catch (e) {
      setErr((e as Error).message);
      load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-slate-500">{apps.length} application(s) tracked</p>
        </div>
        <div className="flex gap-2">
          <Link href="/jobs" className="btn-ghost">Browse matches</Link>
          <button className="btn-primary" onClick={fetchJobs} disabled={fetching}>
            {fetching ? "Fetching…" : "Fetch new jobs"}
          </button>
        </div>
      </div>

      {msg && <Banner kind="success">{msg}</Banner>}
      {err && <Banner kind="error">{err}</Banner>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : apps.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          No applications yet. Head to <Link href="/jobs" className="text-accent underline">Matches</Link> to tailor and queue some roles.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STATUSES.map((status) => {
            const col = apps.filter((a) => a.status === status);
            return (
              <div key={status} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{STATUS_LABELS[status as Status]}</span>
                  <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-600">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((a) => (
                    <div key={a.id} className="card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/applications/${a.id}`} className="font-medium leading-tight hover:underline">
                          {a.job.title}
                        </Link>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${scoreColor(a.job.matchScore)}`}>
                          {a.job.matchScore}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm text-slate-500">{a.job.company}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-400">
                        <span>{a.job.location || (a.job.source === "manual" ? "manual" : a.job.source)}</span>
                        {a.variant?.label && <span>· {a.variant.label}</span>}
                        {a._count.interviews > 0 && <span>· {a._count.interviews} interview(s)</span>}
                      </div>
                      <select
                        className="input mt-2 py-1 text-xs"
                        value={a.status}
                        onChange={(e) => move(a.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
