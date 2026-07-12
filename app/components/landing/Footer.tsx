import { Compass } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-600">
            <Compass className="w-3.5 h-3.5" />
            <span className="font-mono text-sm">Glance</span>
          </div>
          <span className="text-zinc-800 text-xs font-mono">
            Built for GrowthX Hermes Buildathon
          </span>
        </div>
        <span className="text-zinc-800 text-xs font-mono">
          Made with focus &middot; 2026
        </span>
      </div>
    </footer>
  );
}
