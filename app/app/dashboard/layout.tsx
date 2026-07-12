"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Compass, LogOut, FolderGit2, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/repos", label: "Repositories", icon: FolderGit2 },
  { href: "/dashboard/onboarding", label: "Connect", icon: PlugZap },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard/repos"
              className="flex items-center gap-2 font-mono text-white"
            >
              <Compass className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">Glance</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono transition-colors",
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:text-white",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 transition-colors hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
