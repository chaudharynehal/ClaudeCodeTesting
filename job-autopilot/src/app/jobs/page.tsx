"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getJSON, scoreColor, send } from "@/lib/client";
import { Banner, Section, StatusBadge } from "@/components/ui";

interface JobRow {
  id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  source: string;
  salary: string;
  remote: boolean;
  matchScore: number;
  matchReasons: string[];
  application?: { id: string; status: string } | null;
}
interface Variant {
  id: string;
  label: string;
  isDefault: boolean;
  content: string;
}

const blankImport = { company: "", title: "", location: "", url: "", salary: "", description: "", remote: false };

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantId, setVariantId] = useState("");
  const [minScore, setMinScore] = useState(30);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [imp, setImp] = useState({ ...blankImport });

  async function loadJobs(score = minScore) {
    setLoading(true);
    try {
      const data = await getJSON<{ jobs: JobRow[] }>(`/api/jobs?minScore=${score}`);
      setJobs(data.jobs);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const v = await getJSON<{ variants: Variant[] }>("/api/variants");
        setVariants(v.variants);
        const def = v.variants.find((x) => x.isDefault) || v.variants[0];
        if (def) setVariantId(def.id);
      } catch {
        /* non-fatal */
      }
      loadJobs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const needle = q.toLowerCase();
    return jobs.filter(
      (j) =>
        !needle ||
        j.title.toLowerCase().includes(needle) ||
        j.company.toLowerCase().includes(needle) ||
        j.location.toLowerCase().includes(needle),
    );
  }, [jobs, q]);

  async function fetchJobs() {
    setFetching(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await send<{ created: number; updated: number; fetched: number; errors: { source: string }[] }>(
        "/api/jobs/fetch",
        "POST",
      );
      setMsg(`Fetched ${r.fetched} — ${r.created} new, ${r.updated} refreshed${r.errors.length ? `, ${r.errors.length} source(s) failed` : ""}.`);
      await loadJobs();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setFetching(false);
    }
  }

  async function tailor(job: JobRow) {
    setBusy(job.id);
    setErr(null);
    try {
      const r = await send<{ application: { id: string } }>("/api/tailor", "POST", { jobId: job.id, variantId });
      router.push(`/applications/${r.application.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  }

  async function queue(job: JobRow) {
    try {
      await send("/api/applications", "POST", { jobId: job.id, status: "queued" });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, application: { id: "", status: "queued" } } : j)));
      setMsg(`Queued "${job.title}" — view it on the Pipeline.`);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function hide(job: JobRow) {
    try {
      await send(`/api/jobs/${job.id}`, "PATCH", { hidden: true });
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function importJob() {
    setErr(null);
    try {
      await send("/api/jobs/import", "POST", imp);
      setImp({ ...blankImport });
      setShowImport(false);
      setMsg("Imported. It's now in your matches.");
      await loadJobs(0);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Matches</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setShowImport((s) => !s)}>
            {showImport ? "Close import" : "Import a job (LinkedIn/Indeed/URL)"}
          </button>
          <button className="btn-primary" onClick={fetchJobs} disabled={fetching}>
            {fetching ? "Fetching…" : "Fetch new jobs"}
          </button>
        </div>
      </div>

      {msg && <Banner kind="success">{msg}</Banner>}
      {err && <Banner kind="error">{err}</Banner>}

      {showImport && (
        <Section title="Import a job manually">
          <p className="mb-3 text-sm text-slate-500">
            Paste the role from any site (LinkedIn, Indeed, a company page). Include the description so the AI can tailor accurately.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Company *" value={imp.company} onChange={(e) => setImp({ ...imp, company: e.target.value })} />
            <input className="input" placeholder="Title *" value={imp.title} onChange={(e) => setImp({ ...imp, title: e.target.value })} />
            <input className="input" placeholder="Location" value={imp.location} onChange={(e) => setImp({ ...imp, location: e.target.value })} />
            <input className="input" placeholder="Salary (optional)" value={imp.salary} onChange={(e) => setImp({ ...imp, salary: e.target.value })} />
            <input className="input sm:col-span-2" placeholder="Job URL" value={imp.url} onChange={(e) => setImp({ ...imp, url: e.target.value })} />
            <textarea className="input h-32 sm:col-span-2" placeholder="Paste the full job description *" value={imp.description} onChange={(e) => setImp({ ...imp, description: e.target.value })} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={imp.remote} onChange={(e) => setImp({ ...imp, remote: e.target.checked })} /> Remote
            </label>
            <button className="btn-primary" onClick={importJob}>Import</button>
          </div>
        </Section>
      )}

      <div className="card flex flex-wrap items-center gap-3 p-3 text-sm">
        <input className="input max-w-xs" placeholder="Search title / company / location" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2">
          Min score
          <select
            className="input w-20"
            value={minScore}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMinScore(v);
              loadJobs(v);
            }}
          >
            {[0, 30, 50, 70].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="ml-auto flex items-center gap-2">
          Tailor with
          <select className="input w-44" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.label}{v.isDefault ? " (default)" : ""}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          No matches yet. Click <b>Fetch new jobs</b> or import one manually. Tune your filters under Profile.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((job) => (
            <div key={job.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreColor(job.matchScore)}`}>{job.matchScore}</span>
                    <h3 className="truncate font-medium">{job.title}</h3>
                    {job.application && <StatusBadge status={job.application.status} />}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">
                    {job.company} · {job.location || (job.remote ? "Remote" : "—")} · <span className="text-slate-400">{job.source}</span>
                    {job.salary && <span> · {job.salary}</span>}
                  </div>
                  {job.matchReasons.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {job.matchReasons.slice(0, 4).map((r, i) => (
                        <li key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <button className="btn-primary w-28" onClick={() => tailor(job)} disabled={busy === job.id}>
                    {busy === job.id ? "Tailoring…" : "Tailor & open"}
                  </button>
                  <div className="flex gap-1.5">
                    {job.url && (
                      <a className="btn-ghost" href={job.url} target="_blank" rel="noreferrer">Posting</a>
                    )}
                    <button className="btn-ghost" onClick={() => queue(job)}>Queue</button>
                    <button className="btn-ghost" onClick={() => hide(job)}>Hide</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
