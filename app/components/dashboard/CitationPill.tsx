import { GitPullRequest, GitCommit } from "lucide-react";

type Citation = {
  type: "pr" | "commit";
  prNumber?: number;
  shortSha?: string;
  htmlUrl: string;
  title?: string;
};

export function CitationPill({ citation }: { citation: Citation }) {
  const label =
    citation.type === "pr"
      ? `#${citation.prNumber}`
      : (citation.shortSha ?? "commit");
  return (
    <a
      href={citation.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={citation.title}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-black/40 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
    >
      {citation.type === "pr" ? (
        <GitPullRequest className="h-3 w-3" />
      ) : (
        <GitCommit className="h-3 w-3" />
      )}
      {label}
    </a>
  );
}
