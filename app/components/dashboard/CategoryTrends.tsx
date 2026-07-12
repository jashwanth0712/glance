"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORY_META, CATEGORY_ORDER, categoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Mode = "volume" | "share";

function weekLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function CategoryTrends({ repoId }: { repoId: string }) {
  const [mode, setMode] = useState<Mode>("share");
  const trends = useQuery(api.queries.dashboard.getCategoryTrends, {
    repositoryId: repoId as Id<"repositories">,
  });

  const chartData = useMemo(() => {
    if (!trends) return [];
    return trends.weeks.map((w) => {
      const total = CATEGORY_ORDER.reduce(
        (sum, c) => sum + ((w[c] as number) ?? 0),
        0,
      );
      const row: Record<string, number | string> = {
        weekStart: w.weekStart,
        label: weekLabel(w.weekStart),
        total,
      };
      for (const c of CATEGORY_ORDER) {
        const raw = (w[c] as number) ?? 0;
        row[c] =
          mode === "share" ? (total > 0 ? (raw / total) * 100 : 0) : raw;
        row[`${c}__raw`] = raw;
      }
      return row;
    });
  }, [trends, mode]);

  if (trends === undefined) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }
  if (!trends || trends.weeks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-white">Focus over time</h3>
          <p className="text-[11px] font-mono text-zinc-600">
            {mode === "share"
              ? "Share of each week's changes by category"
              : "Classified changes per week by category"}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-zinc-800 bg-black/60 p-0.5">
          <ModeButton
            active={mode === "share"}
            onClick={() => setMode("share")}
            label="Share"
          />
          <ModeButton
            active={mode === "volume"}
            onClick={() => setMode("volume")}
            label="Volume"
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          stackOffset={mode === "share" ? "expand" : "none"}
        >
          <defs>
            {CATEGORY_ORDER.map((c) => (
              <linearGradient
                key={c}
                id={`grad-${c}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={CATEGORY_META[c].hex}
                  stopOpacity={0.7}
                />
                <stop
                  offset="100%"
                  stopColor={CATEGORY_META[c].hex}
                  stopOpacity={0.25}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) =>
              mode === "share" ? `${Math.round(v)}%` : `${v}`
            }
          />
          <Tooltip content={<TrendsTooltip mode={mode} />} />
          {CATEGORY_ORDER.map((c) => (
            <Area
              key={c}
              type="monotone"
              dataKey={c}
              stackId="1"
              stroke={CATEGORY_META[c].hex}
              strokeWidth={1}
              fill={`url(#grad-${c})`}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {CATEGORY_ORDER.map((c) => {
          const meta = categoryMeta(c);
          return (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
              <span className="text-[10px] font-mono text-zinc-500">
                {meta.short}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 text-[11px] font-mono transition-colors",
        active
          ? "bg-indigo-500/90 text-white shadow"
          : "text-zinc-400 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function TrendsTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, number | string> }>;
  label?: string;
  mode: Mode;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  const total = (row.total as number) ?? 0;
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-4">
        <span className="font-medium text-white">{label}</span>
        <span className="font-mono text-[10px] text-zinc-500">
          {total} change{total === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-0.5">
        {[...CATEGORY_ORDER]
          .map((c) => ({ c, raw: (row[`${c}__raw`] as number) ?? 0 }))
          .filter((x) => x.raw > 0)
          .sort((a, b) => b.raw - a.raw)
          .map(({ c, raw }) => {
            const meta = categoryMeta(c);
            const pct = total > 0 ? Math.round((raw / total) * 100) : 0;
            return (
              <div
                key={c}
                className="flex items-center justify-between gap-4 font-mono text-[11px]"
              >
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: meta.hex }}
                  />
                  {meta.short}
                </span>
                <span className="text-zinc-400">
                  {mode === "share" ? `${pct}%` : raw}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
