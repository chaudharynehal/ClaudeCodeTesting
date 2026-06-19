"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fmtDate, getJSON, scoreColor, send } from "@/lib/client";
import { STATUSES, STATUS_LABELS } from "@/lib/types";
import { Banner, Section, StatusBadge } from "@/components/ui";

interface Interview {
  id: string;
  round: string;
  scheduledAt: string | null;
  notes: string;
  outcome: string;
}
interface EmailEvent {
  id: string;
  subject: string;
  classification: string;
  receivedAt: string;
  fromAddr: string;
}
interface AppDetail {
  id: string;
  jobId: string;
  status: string;
  tailoredResume: string;
  tailoredCoverLetter: string;
  fitSummary: string;
  matchHighlights: string[];
  suggestedTweaks: string[];
  notes: string;
  offerSalary: string;
  appliedAt: string | null;
  variantId: string | null;
  job: { company: string; title: string; location: string; url: string; matchScore: number; description: string; source: string };
  variant: { label: string } | null;
  interviews: Interview[];
  emailEvents: EmailEvent[];
}
interface Variant { id: string; label: string; isDefault: boolean }

export default function ApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);

  const [app, setApp] = useState<AppDetail | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantId, setVariantId] = useState("");
  const [resume, setResume] = useState("");
  const [cover, setCover] = useState("");
  const [notes, setNotes] = useState("");
  const [offer, setOffer] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [iv, setIv] = useState({ round: "", scheduledAt: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJSON<{ application: AppDetail }>(`/api/applications/${id}`);
      const a = data.application;
      setApp(a);
      setResume(a.tailoredResume);
      setCover(a.tailoredCoverLetter);
      setNotes(a.notes);
      setOffer(a.offerSalary);
      setVariantId(a.variantId || "");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    getJSON<{ variants: Variant[] }>("/api/variants")
      .then((v) => {
        setVariants(v.variants);
        setVariantId((cur) => cur || v.variants.find((x) => x.isDefault)?.id || v.variants[0]?.id || "");
      })
      .catch(() => {});
  }, [load]);

  async function patch(data: Record<string, unknown>, note?: string) {
    setErr(null);
    try {
      await send(`/api/applications/${id}`, "PATCH", data);
      if (note) setMsg(note);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function saveDocs() {
    setBusy("save");
    await patch({ tailoredResume: resume, tailoredCoverLetter: cover, notes, offerSalary: offer }, "Saved.");
    setBusy(null);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied to clipboard.");
    } catch {
      setErr("Copy failed — select and copy manually.");
    }
  }

  async function addInterview() {
    if (!iv.round.trim()) return;
    try {
      await send("/api/interviews", "POST", {
        applicationId: id,
        round: iv.round,
        scheduledAt: iv.scheduledAt || null,
        notes: iv.notes,
      });
      setIv({ round: "", scheduledAt: "", notes: "" });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function updateInterview(intId: string, data: Record<string, unknown>) {
    try {
      await send("/api/interviews", "PATCH", { id: intId, ...data });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function deleteApp() {
    if (!confirm("Delete this application? The job stays in your matches.")) return;
    await send(`/api/applications/${id}`, "DELETE");
    router.push("/");
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!app) return <Banner kind="error">{err || "Not found."}</Banner>;

  const untailored = !app.tailoredResume && !app.tailoredCoverLetter;

  return (
    <div className="space-y-4">
      <button className="text-sm text-slate-500 hover:underline" onClick={() => router.push("/")}>← Pipeline</button>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreColor(app.job.matchScore)}`}>{app.job.matchScore}</span>
              <h1 className="text-xl font-semibold">{app.job.title}</h1>
            </div>
            <p className="mt-0.5 text-slate-500">
              {app.job.company} · {app.job.location || "—"} · <span className="text-slate-400">{app.job.source}</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={app.status} />
              {app.appliedAt && <span className="text-xs text-slate-400">Applied {fmtDate(app.appliedAt)}</span>}
              {app.variant?.label && <span className="text-xs text-slate-400">· {app.variant.label}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select className="input w-44" value={app.status} onChange={(e) => patch({ status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <div className="flex gap-2">
              {app.job.url && <a className="btn-ghost" href={app.job.url} target="_blank" rel="noreferrer">Open posting</a>}
              {app.status !== "applied" && (
                <button className="btn-primary" onClick={() => patch({ status: "applied" }, "Marked as applied.")}>Mark applied</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {msg && <Banner kind="success">{msg}</Banner>}
      {err && <Banner kind="error">{err}</Banner>}

      <Banner kind="info">
        Assisted apply: review the tailored resume &amp; cover letter below, copy them into the company&apos;s form via
        <b> Open posting</b>, submit, then hit <b>Mark applied</b>. JobPilot prepares everything; you stay in control of the submit.
      </Banner>

      {untailored ? (
        <Section
          title="Tailor this application"
          action={
            <div className="flex items-center gap-2">
              <select className="input w-44" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
              <RetailorButton jobId={app.jobId} variantId={variantId} onDone={load} setErr={setErr} setBusy={setBusy} busy={busy} label="Tailor now" />
            </div>
          }
        >
          <p className="text-sm text-slate-500">No tailored documents yet. Pick a resume variant and generate them.</p>
        </Section>
      ) : (
        <>
          {app.fitSummary && (
            <Section title="Fit summary">
              <p className="text-sm text-slate-700">{app.fitSummary}</p>
              {app.matchHighlights.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Why you fit</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                    {app.matchHighlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
              {app.suggestedTweaks.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-amber-600">Honest gaps to consider</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                    {app.suggestedTweaks.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
            </Section>
          )}

          <Section
            title="Tailored resume"
            action={<button className="btn-ghost" onClick={() => copy(resume)}>Copy</button>}
          >
            <textarea className="input h-80 font-mono text-xs" value={resume} onChange={(e) => setResume(e.target.value)} />
          </Section>

          <Section
            title="Tailored cover letter"
            action={<button className="btn-ghost" onClick={() => copy(cover)}>Copy</button>}
          >
            <textarea className="input h-64" value={cover} onChange={(e) => setCover(e.target.value)} />
          </Section>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" onClick={saveDocs} disabled={busy === "save"}>
              {busy === "save" ? "Saving…" : "Save edits"}
            </button>
            <select className="input w-44" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <RetailorButton jobId={app.jobId} variantId={variantId} onDone={load} setErr={setErr} setBusy={setBusy} busy={busy} label="Re-tailor" />
          </div>
        </>
      )}

      <Section title="Interviews & offer">
        {app.status === "offer" && (
          <div className="mb-4">
            <label className="label">Offer details / salary</label>
            <div className="flex gap-2">
              <input className="input" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="$160k base + equity" />
              <button className="btn-ghost" onClick={() => patch({ offerSalary: offer }, "Offer saved.")}>Save</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {app.interviews.map((i) => (
            <div key={i.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{i.round}</span>
                <select className="input w-32 py-1 text-xs" value={i.outcome} onChange={(e) => updateInterview(i.id, { outcome: e.target.value })}>
                  {["pending", "passed", "failed"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <p className="mt-1 text-xs text-slate-400">{i.scheduledAt ? fmtDate(i.scheduledAt) : "no date"}</p>
              {i.notes && <p className="mt-1 text-sm text-slate-600">{i.notes}</p>}
            </div>
          ))}
          {app.interviews.length === 0 && <p className="text-sm text-slate-500">No interviews logged yet.</p>}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input className="input" placeholder="Round (e.g. Phone screen)" value={iv.round} onChange={(e) => setIv({ ...iv, round: e.target.value })} />
          <input className="input" type="datetime-local" value={iv.scheduledAt} onChange={(e) => setIv({ ...iv, scheduledAt: e.target.value })} />
          <input className="input sm:col-span-1" placeholder="Notes / prep" value={iv.notes} onChange={(e) => setIv({ ...iv, notes: e.target.value })} />
          <button className="btn-ghost" onClick={addInterview}>Add interview</button>
        </div>
      </Section>

      {app.emailEvents.length > 0 && (
        <Section title="Detected emails">
          <ul className="space-y-1 text-sm">
            {app.emailEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{e.subject}</span>
                <span className="shrink-0 text-xs text-slate-400">{e.classification} · {fmtDate(e.receivedAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Notes" action={<button className="btn-ghost" onClick={() => patch({ notes }, "Notes saved.")}>Save notes</button>}>
        <textarea className="input h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Recruiter name, referral, follow-up reminders…" />
      </Section>

      <div className="flex justify-end">
        <button className="btn-danger" onClick={deleteApp}>Delete application</button>
      </div>
    </div>
  );
}

// Generates (or regenerates) the tailored docs for this application's job.
function RetailorButton({
  jobId,
  variantId,
  onDone,
  setErr,
  setBusy,
  busy,
  label,
}: {
  jobId: string;
  variantId: string;
  onDone: () => void | Promise<void>;
  setErr: (s: string | null) => void;
  setBusy: (s: string | null) => void;
  busy: string | null;
  label: string;
}) {
  async function run() {
    setBusy("retailor");
    setErr(null);
    try {
      await send("/api/tailor", "POST", { jobId, variantId });
      await onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <button className="btn-primary" onClick={run} disabled={busy === "retailor"}>
      {busy === "retailor" ? "Tailoring…" : label}
    </button>
  );
}
