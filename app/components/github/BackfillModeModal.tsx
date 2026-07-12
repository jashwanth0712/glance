"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { History, CalendarClock, Sparkles } from "lucide-react";

export type BackfillMode = "full" | "7days" | "none";

const OPTIONS: {
  mode: BackfillMode;
  title: string;
  desc: string;
  icon: typeof History;
}[] = [
  {
    mode: "full",
    title: "Entire history",
    desc: "Analyze every PR and commit ever made.",
    icon: History,
  },
  {
    mode: "7days",
    title: "Last 7 days",
    desc: "Only the past week of activity.",
    icon: CalendarClock,
  },
  {
    mode: "none",
    title: "From now on",
    desc: "Only track new activity going forward.",
    icon: Sparkles,
  },
];

export function BackfillModeModal({
  repoName,
  onConfirm,
  onCancel,
  busy,
}: {
  repoName: string;
  onConfirm: (mode: BackfillMode) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [mode, setMode] = useState<BackfillMode>("7days");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6">
        <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
          Backfill window
        </p>
        <h2 className="mb-1 text-lg font-medium text-white">
          Track <span className="font-mono">{repoName}</span>
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          How much history should Hermes analyze?
        </p>

        <div className="mb-6 grid gap-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => setMode(opt.mode)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-indigo-500/60 bg-indigo-500/10"
                    : "border-zinc-800 bg-black/40 hover:border-zinc-700",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    active ? "text-indigo-300" : "text-zinc-500",
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-white">{opt.title}</p>
                  <p className="text-xs text-zinc-500">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(mode)} disabled={busy}>
            {busy ? "Starting…" : "Start tracking"}
          </Button>
        </div>
      </div>
    </div>
  );
}
