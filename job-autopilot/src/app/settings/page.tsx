"use client";

import { useEffect, useState } from "react";
import { fmtDate, getJSON, send } from "@/lib/client";
import { Banner, Section } from "@/components/ui";

interface Source { id: number; type: string; token: string; name: string; enabled: boolean }
interface Variant { id: string; label: string; content: string; isDefault: boolean }
interface EmailEvt { id: string; subject: string; classification: string; receivedAt: string; application?: { job?: { company?: string } } | null }
interface Config { anthropic: boolean; model: string; email: boolean }

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [events, setEvents] = useState<EmailEvt[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [newSource, setNewSource] = useState({ type: "greenhouse", token: "", name: "" });
  const [newVariant, setNewVariant] = useState({ label: "", content: "" });

  async function loadAll() {
    try {
      setConfig(await getJSON<Config>("/api/config"));
      setSources((await getJSON<{ sources: Source[] }>("/api/sources")).sources);
      setVariants((await getJSON<{ variants: Variant[] }>("/api/variants")).variants);
      const e = await getJSON<{ configured: boolean; events: EmailEvt[] }>("/api/email/scan");
      setEmailConfigured(e.configured);
      setEvents(e.events);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function flash(m: string) {
    setMsg(m);
    setErr(null);
  }

  async function addSource() {
    try {
      await send("/api/sources", "POST", newSource);
      setNewSource({ type: "greenhouse", token: "", name: "" });
      await loadAll();
      flash("Source added.");
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function toggleSource(s: Source) {
    await send(`/api/sources/${s.id}`, "PATCH", { enabled: !s.enabled });
    loadAll();
  }
  async function deleteSource(s: Source) {
    await send(`/api/sources/${s.id}`, "DELETE");
    loadAll();
  }

  async function addVariant() {
    if (!newVariant.label.trim()) return;
    await send("/api/variants", "POST", newVariant);
    setNewVariant({ label: "", content: "" });
    await loadAll();
    flash("Variant added.");
  }
  async function saveVariant(v: Variant) {
    await send(`/api/variants/${v.id}`, "PATCH", { label: v.label, content: v.content });
    flash("Variant saved.");
  }
  async function deleteVariant(v: Variant) {
    try {
      await send(`/api/variants/${v.id}`, "DELETE");
      await loadAll();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function scan() {
    setScanning(true);
    setErr(null);
    try {
      const r = await send<{ scanned: number; matched: number; updates: unknown[] }>("/api/email/scan", "POST");
      flash(`Scanned ${r.scanned} emails, matched ${r.matched}, updated ${r.updates.length} application(s).`);
      await loadAll();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      {msg && <Banner kind="success">{msg}</Banner>}
      {err && <Banner kind="error">{err}</Banner>}

      <Section title="Status">
        <ul className="space-y-1 text-sm">
          <li>
            AI tailoring (Anthropic):{" "}
            {config?.anthropic ? <b className="text-emerald-600">enabled</b> : <b className="text-rose-600">disabled — set ANTHROPIC_API_KEY in .env</b>}
            {config?.anthropic && <span className="text-slate-400"> · model {config.model}</span>}
          </li>
          <li>
            Email tracking (IMAP):{" "}
            {config?.email ? <b className="text-emerald-600">configured</b> : <span className="text-slate-500">not configured (optional — set IMAP_* in .env)</span>}
          </li>
        </ul>
      </Section>

      <Section title="ATS job sources">
        <p className="mb-3 text-sm text-slate-500">
          Add the boards you want to pull from. Find a company&apos;s token in its careers URL:
          <code className="mx-1 rounded bg-slate-100 px-1">boards.greenhouse.io/&lt;token&gt;</code>,
          <code className="mx-1 rounded bg-slate-100 px-1">jobs.lever.co/&lt;slug&gt;</code>,
          <code className="mx-1 rounded bg-slate-100 px-1">jobs.ashbyhq.com/&lt;board&gt;</code>. Remote boards (RemoteOK, WeWorkRemotely) are always included.
        </p>
        <div className="mb-3 space-y-1">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="w-24 text-slate-400">{s.type}</span>
              <span className="font-medium">{s.token}</span>
              {s.name && <span className="text-slate-400">· {s.name}</span>}
              <div className="ml-auto flex items-center gap-2">
                <button className="btn-ghost py-1" onClick={() => toggleSource(s)}>{s.enabled ? "Enabled" : "Disabled"}</button>
                <button className="btn-danger py-1" onClick={() => deleteSource(s)}>Remove</button>
              </div>
            </div>
          ))}
          {sources.length === 0 && <p className="text-sm text-slate-500">No ATS sources yet.</p>}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <select className="input w-36" value={newSource.type} onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}>
            <option value="greenhouse">greenhouse</option>
            <option value="lever">lever</option>
            <option value="ashby">ashby</option>
          </select>
          <input className="input w-40" placeholder="token / slug" value={newSource.token} onChange={(e) => setNewSource({ ...newSource, token: e.target.value })} />
          <input className="input w-40" placeholder="display name (optional)" value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} />
          <button className="btn-primary" onClick={addSource}>Add source</button>
        </div>
      </Section>

      <Section title="Resume variants (A/B testing)">
        <p className="mb-3 text-sm text-slate-500">
          Keep multiple base resumes (e.g. &quot;Backend-focused&quot;, &quot;Leadership&quot;). Pick one when tailoring; Analytics compares their response rates.
        </p>
        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={v.id} className="rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  className="input max-w-xs"
                  value={v.label}
                  disabled={v.isDefault}
                  onChange={(e) => setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                />
                {v.isDefault && <span className="text-xs text-slate-400">default — edit content in Profile</span>}
                <div className="ml-auto flex gap-2">
                  {!v.isDefault && <button className="btn-ghost py-1" onClick={() => saveVariant(v)}>Save</button>}
                  {!v.isDefault && <button className="btn-danger py-1" onClick={() => deleteVariant(v)}>Delete</button>}
                </div>
              </div>
              {!v.isDefault && (
                <textarea
                  className="input h-40 font-mono text-xs"
                  value={v.content}
                  onChange={(e) => setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, content: e.target.value } : x)))}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <input className="input max-w-xs" placeholder="New variant label" value={newVariant.label} onChange={(e) => setNewVariant({ ...newVariant, label: e.target.value })} />
          <textarea className="input h-32 font-mono text-xs" placeholder="Paste this variant's resume…" value={newVariant.content} onChange={(e) => setNewVariant({ ...newVariant, content: e.target.value })} />
          <button className="btn-primary" onClick={addVariant}>Add variant</button>
        </div>
      </Section>

      <Section
        title="Email response tracking"
        action={
          <button className="btn-primary" onClick={scan} disabled={!emailConfigured || scanning}>
            {scanning ? "Scanning…" : "Scan inbox now"}
          </button>
        }
      >
        {!emailConfigured ? (
          <p className="text-sm text-slate-500">
            Set <code className="rounded bg-slate-100 px-1">IMAP_HOST / IMAP_PORT / IMAP_USER / IMAP_PASSWORD</code> in <code>.env</code> to enable. For Gmail, use an App Password.
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-500">
              Scans your inbox, matches messages to companies you applied to, and advances statuses
              (responded / interview / offer / rejected). Heuristic — review before trusting.
            </p>
            <ul className="space-y-1 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{e.application?.job?.company ? `${e.application.job.company} — ` : ""}{e.subject}</span>
                  <span className="shrink-0 text-xs text-slate-400">{e.classification} · {fmtDate(e.receivedAt)}</span>
                </li>
              ))}
              {events.length === 0 && <li className="text-sm text-slate-500">No matched emails yet.</li>}
            </ul>
          </>
        )}
      </Section>
    </div>
  );
}
