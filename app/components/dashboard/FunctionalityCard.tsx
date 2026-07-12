import { CategoryBadge } from "./CategoryBadge";
import { CitationPill } from "./CitationPill";
import { ContributorAvatarStack } from "./ContributorAvatarStack";

type Citation = {
  type: "pr" | "commit";
  prNumber?: number;
  shortSha?: string;
  htmlUrl: string;
  title?: string;
  authorLogin?: string;
  authorAvatarUrl?: string;
};

export type FunctionalityUnit = {
  _id: string;
  title: string;
  summary: string;
  categories: string[];
  citations: Citation[];
  memberCount: number;
};

export function FunctionalityCard({ unit }: { unit: FunctionalityUnit }) {
  const contributors = unit.citations.map((c) => ({
    login: c.authorLogin,
    avatarUrl: c.authorAvatarUrl,
  }));

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-medium tracking-tight text-white">
          {unit.title}
        </h3>
        <span className="shrink-0 text-[10px] font-mono text-zinc-600">
          {unit.memberCount} {unit.memberCount === 1 ? "change" : "changes"}
        </span>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-zinc-400">
        {unit.summary}
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {unit.categories.map((c) => (
          <CategoryBadge key={c} category={c} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {unit.citations.slice(0, 8).map((c, i) => (
            <CitationPill key={i} citation={c} />
          ))}
          {unit.citations.length > 8 && (
            <span className="text-[10px] font-mono text-zinc-600">
              +{unit.citations.length - 8} more
            </span>
          )}
        </div>
        <ContributorAvatarStack contributors={contributors} />
      </div>
    </div>
  );
}
