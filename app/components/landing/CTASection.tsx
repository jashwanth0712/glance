"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

interface CTASectionProps {
  signingIn: boolean;
  onCTA: () => void;
}

export default function CTASection({ signingIn, onCTA }: CTASectionProps) {
  return (
    <section className="px-4 py-20 sm:py-28 border-t border-zinc-800/50">
      <div className="max-w-3xl mx-auto relative">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/[0.03] blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="relative z-10 text-center flex flex-col items-center gap-6"
        >
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-600">
            Ready to focus?
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] font-[family-name:var(--font-bricolage-grotesque)]">
            Stop building the{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              wrong things
            </span>
          </h2>
          <p className="text-zinc-500 text-base sm:text-lg max-w-lg leading-relaxed">
            Join teams that ship with intention, not just velocity. Let Glance be
            your compass.
          </p>
          <button
            onClick={onCTA}
            disabled={signingIn}
            className="bg-white text-black hover:bg-zinc-200 transition-colors font-mono font-semibold text-sm h-12 px-8 rounded-full flex items-center gap-2 disabled:opacity-50"
          >
            {signingIn ? "Signing in..." : "Get Started — It's Free"}
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs font-mono text-zinc-700">
            No credit card required &middot; Free during buildathon
          </p>
        </motion.div>
      </div>
    </section>
  );
}
