"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";
import { LogOut, Compass } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const { signOut } = useAuthActions();

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-mono text-white">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-sm">Glance</span>
        </Link>
        <button
          onClick={() => void signOut()}
          className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-lg"
        >
          <div className="flex justify-center mb-8">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20" />
              </motion.div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Compass className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-600 mb-4">
            Dashboard
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4 font-[family-name:var(--font-bricolage-grotesque)]">
            Thanks for logging in,{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              {firstName}!
            </span>
          </h1>
          <p className="text-zinc-500 text-sm leading-relaxed font-mono">
            Your compass is being calibrated. The full Glance experience is
            coming soon.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
