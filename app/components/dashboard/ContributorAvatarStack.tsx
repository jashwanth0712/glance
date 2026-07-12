type Contributor = { login?: string; avatarUrl?: string };

export function ContributorAvatarStack({
  contributors,
  max = 5,
}: {
  contributors: Contributor[];
  max?: number;
}) {
  // De-dupe by login.
  const seen = new Set<string>();
  const unique = contributors.filter((c) => {
    const key = c.login ?? c.avatarUrl ?? "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((c, i) => (
          <img
            key={c.login ?? i}
            src={
              c.avatarUrl ||
              `https://avatars.githubusercontent.com/u/0?v=4`
            }
            alt={c.login ?? "contributor"}
            title={c.login}
            className="h-6 w-6 rounded-full border border-black bg-zinc-800 object-cover"
          />
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-2 text-[10px] font-mono text-zinc-500">
          +{extra}
        </span>
      )}
    </div>
  );
}
