"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { X, Sparkles, RefreshCw, Info } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORY_META, CATEGORY_ORDER, categoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { FunctionalityCard } from "./FunctionalityCard";
import { ContributorBarList } from "./ContributorBarList";

export type WindowKey = "3d" | "1w" | "1m" | "3m";

export const WINDOW_OPTIONS: { key: WindowKey; label: string }[] = [
  { key: "3d", label: "3 days" },
  { key: "1w", label: "1 week" },
  { key: "1m", label: "1 month" },
  { key: "3m", label: "3 months" },
];

export function GlanceDrawer({
  repoId,
  repoName,
  windowKey,
  onWindowChange,
  onClose,
}: {
  repoId: string;
  repoName: string;
  windowKey: WindowKey;
  onWindowChange: (w: WindowKey) => void;
  onClose: () => void;
}) {
  const data = useQuery(api.queries.glance.getGlanceData, {
    repositoryId: repoId as Id<"repositories">,
    windowKey,
  });

  const windowLabel =
    WINDOW_OPTIONS.find((w) => w.key === windowKey)?.label ?? windowKey;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-zinc-800 bg-black/95 backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/60 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-medium text-white">Glance</h2>
            </div>
            <p className="mt-0.5 text-[11px] font-mono text-zinc-600">
              {repoName} · past {windowLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Window picker */}
        <div className="border-b border-zinc-800/60 px-5 py-3">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-black/60 p-0.5">
            {WINDOW_OPTIONS.map((w) => (
              <button
                key={w.key}
                onClick={() => onWindowChange(w.key)}
                className={cn(
                  "rounded-md px-3 py-1 text-[11px] font-mono transition-colors",
                  windowKey === w.key
                    ? "bg-indigo-500/90 text-white shadow"
                    : "text-zinc-400 hover:text-white",
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {data === undefined && <DrawerSpinner />}

          {data === null && (
            <p className="py-16 text-center text-sm text-zinc-500">
              Unable to load this repository.
            </p>
          )}

          {data && data.classifiedCount === 0 && (
            <GlanceEmpty pendingCount={data.pendingCount} label={windowLabel} />
          )}

          {data && data.classifiedCount > 0 && (
            <div className="space-y-6">
              {data.pendingCount > 0 && (
                <PendingBanner
                  pending={data.pendingCount}
                  classified={data.classifiedCount}
                />
              )}

              <CategoryBar
                categoryCounts={data.categoryCounts}
                classifiedCount={data.classifiedCount}
              />

              {data.alignmentScore !== null && (
                <AlignmentSignal
                  score={data.alignmentScore}
                  label={data.alignmentLabel ?? ""}
                />
              )}

              <TopThemes
                units={data.topUnits}
                totalTouched={data.totalTouchedUnits}
              />

              <TeamContributions contributors={data.contributors} />

              <NarrativeSection
                repoId={repoId}
                windowKey={windowKey}
                classifiedCount={data.classifiedCount}
              />

              {data.capped && (
                <p className="text-[10px] font-mono text-zinc-600">
                  Showing a sample of up to 500 items per type for this window.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function DrawerSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-medium text-white">{title}</h3>
      {hint && <p className="text-[11px] font-mono text-zinc-600">{hint}</p>}
    </div>
  );
}

function PendingBanner({
  pending,
  classified,
}: {
  pending: number;
  classified: number;
}) {
  const coverage = Math.round((classified / (classified + pending)) * 100);
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
      {pending} item{pending === 1 ? "" : "s"} still being classified — this
      view covers {coverage}% of the window so far.
    </div>
  );
}

function CategoryBar({
  categoryCounts,
  classifiedCount,
}: {
  categoryCounts: Record<string, number>;
  classifiedCount: number;
}) {
  const total = CATEGORY_ORDER.reduce(
    (s, c) => s + (categoryCounts[c] ?? 0),
    0,
  );
  return (
    <div>
      <SectionHeading
        title="What kind of work went in"
        hint={`${classifiedCount} classified change${classifiedCount === 1 ? "" : "s"}`}
      />
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-zinc-800/40">
        {CATEGORY_ORDER.map((cat) => {
          const val = categoryCounts[cat] ?? 0;
          if (val === 0 || total === 0) return null;
          return (
            <div
              key={cat}
              className="h-full"
              title={`${CATEGORY_META[cat].short}: ${val}`}
              style={{
                width: `${(val / total) * 100}%`,
                background: CATEGORY_META[cat].hex,
              }}
            />
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {CATEGORY_ORDER.map((cat) => {
          const meta = categoryMeta(cat);
          const val = categoryCounts[cat] ?? 0;
          return (
            <span key={cat} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: meta.hex }}
              />
              <span className="text-[10px] font-mono text-zinc-400">
                {meta.short}
              </span>
              <span className="text-[10px] font-mono text-zinc-600">{val}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AlignmentSignal({ score, label }: { score: number; label: string }) {
  // Color the score from amber (low) to emerald (high).
  const color =
    score >= 65 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171";
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-white">Team alignment</h3>
          <span
            title="How similar contributors' category mixes are. High = the team is focused on the same kinds of work; low = people are spread across different areas."
            className="text-zinc-600"
          >
            <Info className="h-3 w-3" />
          </span>
        </div>
        <span className="text-[11px] font-mono" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span
          className="text-3xl font-semibold leading-none"
          style={{ color }}
        >
          {score}
        </span>
        <span className="pb-0.5 text-[11px] font-mono text-zinc-600">/100</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/60">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

type DrawerUnit = {
  _id: string;
  title: string;
  summary: string;
  categories: string[];
  citations: {
    type: "pr" | "commit";
    prNumber?: number;
    shortSha?: string;
    htmlUrl: string;
    title?: string;
    authorLogin?: string;
    authorAvatarUrl?: string;
  }[];
  memberCount: number;
};

function TopThemes({
  units,
  totalTouched,
}: {
  units: DrawerUnit[];
  totalTouched: number;
}) {
  if (units.length === 0) return null;
  return (
    <div>
      <SectionHeading
        title="Top themes"
        hint="What the team worked on in this window"
      />
      <div className="space-y-3">
        {units.map((u) => (
          <FunctionalityCard key={u._id} unit={u} />
        ))}
      </div>
      {totalTouched > units.length && (
        <p className="mt-2 text-[10px] font-mono text-zinc-600">
          and {totalTouched - units.length} more theme
          {totalTouched - units.length === 1 ? "" : "s"} with activity
        </p>
      )}
    </div>
  );
}

function TeamContributions({
  contributors,
}: {
  contributors: {
    login: string;
    avatarUrl: string;
    counts: Record<string, number>;
    total: number;
  }[];
}) {
  if (contributors.length === 0) return null;
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <SectionHeading
        title="Who contributed"
        hint="Category mix per person in this window"
      />
      <ContributorBarList contributors={contributors} />
    </div>
  );
}

function NarrativeSection({
  repoId,
  windowKey,
  classifiedCount,
}: {
  repoId: string;
  windowKey: WindowKey;
  classifiedCount: number;
}) {
  const generate = useAction(api.pipeline.glance.generateGlanceNarrative);
  const [status, setStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [narrative, setNarrative] = useState<string>("");

  const run = async (force: boolean) => {
    setStatus("loading");
    try {
      const text = await generate({
        repositoryId: repoId as Id<"repositories">,
        windowKey,
        forceRegenerate: force,
      });
      setNarrative(text);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Executive summary</h3>
        {status === "done" && (
          <button
            onClick={() => run(true)}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 transition-colors hover:text-white"
          >
            <RefreshCw className="h-3 w-3" /> Regenerate
          </button>
        )}
      </div>

      {status === "idle" && (
        <button
          onClick={() => run(false)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300 transition-colors hover:bg-indigo-500/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate summary
        </button>
      )}

      {status === "loading" && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          Reading {classifiedCount} changes…
        </div>
      )}

      {status === "done" && (
        <blockquote className="border-l-2 border-indigo-500/40 pl-3 text-sm leading-relaxed text-zinc-300">
          {narrative}
        </blockquote>
      )}

      {status === "error" && (
        <div className="text-xs text-red-400">
          Couldn&apos;t generate a summary.{" "}
          <button
            onClick={() => run(false)}
            className="underline hover:text-red-300"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function GlanceEmpty({
  pendingCount,
  label,
}: {
  pendingCount: number;
  label: string;
}) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-zinc-400">
        No classified activity in the past {label}.
      </p>
      {pendingCount > 0 && (
        <p className="mt-2 text-[11px] font-mono text-zinc-600">
          {pendingCount} item{pendingCount === 1 ? "" : "s"} still being
          classified — check back in a few minutes.
        </p>
      )}
    </div>
  );
}
