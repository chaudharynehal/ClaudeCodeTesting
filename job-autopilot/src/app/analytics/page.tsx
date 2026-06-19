"use client";

import { useEffect, useState } from "react";
import { getJSON } from "@/lib/client";
import { STATUS_LABELS, type Status } from "@/lib/types";
import { Banner, Section } from "@/components/ui";

interface Analytics {
  total: number;
  byStatus: Record<string, number>;
  funnel: { applied: number; responded: number; interviewed: number; offers: number };
  rates: { responseRate: number; interviewRate: number; offerRate: number };
  byVariant: { label: string; applied: number; responded: number; responseRate: number }[];
  bySource: { source: string; applied: number; responded: number; responseRate: number }[];
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-semibold">{value}{suffix}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [a, setA] = useState<Analytics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getJSON<Analytics>("/api/analytics").then(setA).catch((e) => setErr((e as Error).message));
  }, []);

  if (err) return <Banner kind="error">{err}</Banner>;
  if (!a) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tracked" value={a.total} />
        <Stat label="Applied" value={a.funnel.applied} />
        <Stat label="Responses" value={a.funnel.responded} />
        <Stat label="Offers" value={a.funnel.offers} />
      </div>

      <Section title="Conversion rates">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Response rate" value={a.rates.responseRate} suffix="%" />
          <Stat label="Interview rate" value={a.rates.interviewRate} suffix="%" />
          <Stat label="Offer rate" value={a.rates.offerRate} suffix="%" />
        </div>
        <p className="mt-3 text-xs text-slate-400">Rates are measured against applications that reached the &quot;applied&quot; stage or beyond.</p>
      </Section>

      <Section title="A/B — response rate by resume variant">
        {a.byVariant.length === 0 ? (
          <p className="text-sm text-slate-500">Apply with at least one tailored resume variant to see comparisons.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="py-1">Variant</th><th>Applied</th><th>Responses</th><th>Response rate</th></tr>
            </thead>
            <tbody>
              {a.byVariant.map((v) => (
                <tr key={v.label} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{v.label}</td>
                  <td>{v.applied}</td>
                  <td>{v.responded}</td>
                  <td className="font-semibold">{v.responseRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="By source">
        {a.bySource.length === 0 ? (
          <p className="text-sm text-slate-500">No applications yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="py-1">Source</th><th>Applied</th><th>Responses</th><th>Response rate</th></tr>
            </thead>
            <tbody>
              {a.bySource.map((s) => (
                <tr key={s.source} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{s.source}</td>
                  <td>{s.applied}</td>
                  <td>{s.responded}</td>
                  <td className="font-semibold">{s.responseRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="By status">
        <div className="flex flex-wrap gap-2">
          {Object.entries(a.byStatus).map(([s, n]) => (
            <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
              {STATUS_LABELS[s as Status] || s}: <b>{n}</b>
            </span>
          ))}
          {Object.keys(a.byStatus).length === 0 && <span className="text-sm text-slate-500">Nothing tracked yet.</span>}
        </div>
      </Section>
    </div>
  );
}
