"use client";

import { useEffect, useState } from "react";
import { getJSON, send } from "@/lib/client";
import { splitToList } from "@/lib/json";
import { Banner, Section } from "@/components/ui";

interface ProfileResponse {
  profile: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    links: Record<string, string>;
    coverLetterText: string;
    targetRoles: string[];
    locations: string[];
    keywords: string[];
    excludeKeywords: string[];
    remoteOnly: boolean;
    minSalary: number | null;
    seniority: string;
  };
  defaultResume: string;
}

const empty = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
  targetRoles: "",
  locations: "",
  keywords: "",
  excludeKeywords: "",
  seniority: "",
  remoteOnly: false,
  minSalary: "",
  defaultResume: "",
  coverLetterText: "",
};

export default function OnboardingPage() {
  const [f, setF] = useState({ ...empty });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { profile, defaultResume } = await getJSON<ProfileResponse>("/api/profile");
        setF({
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          linkedin: profile.links.linkedin || "",
          github: profile.links.github || "",
          portfolio: profile.links.portfolio || "",
          targetRoles: profile.targetRoles.join(", "),
          locations: profile.locations.join(", "),
          keywords: profile.keywords.join(", "),
          excludeKeywords: profile.excludeKeywords.join(", "),
          seniority: profile.seniority,
          remoteOnly: profile.remoteOnly,
          minSalary: profile.minSalary ? String(profile.minSalary) : "",
          defaultResume,
          coverLetterText: profile.coverLetterText,
        });
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await send("/api/profile", "PUT", {
        fullName: f.fullName,
        email: f.email,
        phone: f.phone,
        location: f.location,
        links: { linkedin: f.linkedin, github: f.github, portfolio: f.portfolio },
        coverLetterText: f.coverLetterText,
        targetRoles: splitToList(f.targetRoles),
        locations: splitToList(f.locations),
        keywords: splitToList(f.keywords),
        excludeKeywords: splitToList(f.excludeKeywords),
        seniority: f.seniority,
        remoteOnly: f.remoteOnly,
        minSalary: f.minSalary ? Number(f.minSalary) : null,
        defaultResume: f.defaultResume,
      });
      setMsg("Saved. Your matches and tailoring now use this profile.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your profile</h1>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>

      {msg && <Banner kind="success">{msg}</Banner>}
      {err && <Banner kind="error">{err}</Banner>}

      <Section title="Contact">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="label">Based in</label>
            <input className="input" value={f.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div>
            <label className="label">LinkedIn</label>
            <input className="input" value={f.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
          </div>
          <div>
            <label className="label">GitHub</label>
            <input className="input" value={f.github} onChange={(e) => set("github", e.target.value)} />
          </div>
          <div>
            <label className="label">Portfolio / website</label>
            <input className="input" value={f.portfolio} onChange={(e) => set("portfolio", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="What you're looking for">
        <p className="mb-3 text-sm text-slate-500">
          These drive job matching. Separate multiple values with commas or new lines.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Target roles</label>
            <textarea className="input h-20" placeholder="Senior Backend Engineer, Platform Engineer" value={f.targetRoles} onChange={(e) => set("targetRoles", e.target.value)} />
          </div>
          <div>
            <label className="label">Key skills / keywords</label>
            <textarea className="input h-20" placeholder="Go, Kubernetes, Postgres, AWS" value={f.keywords} onChange={(e) => set("keywords", e.target.value)} />
          </div>
          <div>
            <label className="label">Preferred locations</label>
            <textarea className="input h-20" placeholder="Berlin, London, Remote EU" value={f.locations} onChange={(e) => set("locations", e.target.value)} />
          </div>
          <div>
            <label className="label">Exclude if it mentions</label>
            <textarea className="input h-20" placeholder="on-site only, security clearance, PHP" value={f.excludeKeywords} onChange={(e) => set("excludeKeywords", e.target.value)} />
          </div>
          <div>
            <label className="label">Seniority hint</label>
            <input className="input" placeholder="Senior / Staff / Lead" value={f.seniority} onChange={(e) => set("seniority", e.target.value)} />
          </div>
          <div>
            <label className="label">Minimum salary (optional)</label>
            <input className="input" type="number" value={f.minSalary} onChange={(e) => set("minSalary", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.remoteOnly} onChange={(e) => set("remoteOnly", e.target.checked)} />
            Remote roles only
          </label>
        </div>
      </Section>

      <Section title="Base resume">
        <p className="mb-2 text-sm text-slate-500">
          Paste your resume as plain text or Markdown. This is the source the AI tailors from — it will
          re-emphasize and rephrase, never invent. (Add more variants for A/B testing under Settings.)
        </p>
        <textarea className="input h-72 font-mono text-xs" value={f.defaultResume} onChange={(e) => set("defaultResume", e.target.value)} />
      </Section>

      <Section title="Base cover letter (tone reference)">
        <p className="mb-2 text-sm text-slate-500">
          Optional. A sample cover letter the AI uses to match your voice. Leave blank to have it write from scratch.
        </p>
        <textarea className="input h-44" value={f.coverLetterText} onChange={(e) => set("coverLetterText", e.target.value)} />
      </Section>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
