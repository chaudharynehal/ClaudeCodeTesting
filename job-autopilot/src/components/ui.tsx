"use client";

import { STATUS_LABELS, type Status } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  matched: "bg-slate-100 text-slate-700",
  queued: "bg-sky-100 text-sky-700",
  applied: "bg-indigo-100 text-indigo-700",
  waiting: "bg-violet-100 text-violet-700",
  responded: "bg-cyan-100 text-cyan-700",
  interview: "bg-amber-100 text-amber-700",
  offer: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-600",
  archived: "bg-slate-100 text-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || "bg-slate-100"}`}>
      {STATUS_LABELS[status as Status] || status}
    </span>
  );
}

export function Banner({ kind, children }: { kind: "info" | "error" | "success"; children: React.ReactNode }) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[kind];
  return <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
