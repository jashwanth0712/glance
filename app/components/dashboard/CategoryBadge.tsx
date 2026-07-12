import { categoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function CategoryBadge({
  category,
  short = false,
}: {
  category: string;
  short?: boolean;
}) {
  const meta = categoryMeta(category);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono",
        meta.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {short ? meta.short : meta.label}
    </span>
  );
}
