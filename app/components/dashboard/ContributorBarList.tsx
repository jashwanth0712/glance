import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";

export type ContributorRow = {
  login: string;
  avatarUrl: string;
  counts: Record<string, number>;
  total: number;
};

/** Pure renderer: one segmented category-mix bar per contributor. */
export function ContributorBarList({
  contributors,
}: {
  contributors: ContributorRow[];
}) {
  return (
    <div className="space-y-2.5">
      {contributors.map((c) => (
        <div key={c.login} className="flex items-center gap-3">
          <div className="flex w-32 shrink-0 items-center gap-2">
            {c.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.avatarUrl}
                alt={c.login}
                className="h-5 w-5 rounded-full border border-zinc-700"
              />
            ) : (
              <div className="h-5 w-5 rounded-full border border-zinc-700 bg-zinc-800" />
            )}
            <span className="truncate text-xs text-zinc-300" title={c.login}>
              {c.login}
            </span>
          </div>

          <div className="flex h-4 flex-1 overflow-hidden rounded-full bg-zinc-800/40">
            {CATEGORY_ORDER.map((cat) => {
              const val = (c.counts[cat] as number) ?? 0;
              if (val === 0) return null;
              const pct = (val / c.total) * 100;
              return (
                <div
                  key={cat}
                  className="h-full"
                  title={`${CATEGORY_META[cat].short}: ${val}`}
                  style={{
                    width: `${pct}%`,
                    background: CATEGORY_META[cat].hex,
                  }}
                />
              );
            })}
          </div>

          <span className="w-8 shrink-0 text-right text-[10px] font-mono text-zinc-500">
            {c.total}
          </span>
        </div>
      ))}
    </div>
  );
}
