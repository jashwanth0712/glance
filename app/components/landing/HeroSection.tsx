"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

interface HeroSectionProps {
  signingIn: boolean;
  onCTA: () => void;
}

export default function HeroSection({ signingIn, onCTA }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden px-4 pt-32 sm:pt-40 pb-20">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/[0.04] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-10 left-[60%] -translate-x-1/2 w-[400px] h-[250px] bg-indigo-500/[0.03] blur-[100px] rounded-full pointer-events-none" />

      {/* Dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.03,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0, ease }}
          className="flex items-center gap-2 rounded-full bg-zinc-900/80 border border-zinc-800 px-4 py-1.5 backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-mono text-zinc-400 tracking-wide">
            AI Product Compass
          </span>
        </motion.div>

        {/* H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.035em] leading-[1.08] font-[family-name:var(--font-bricolage-grotesque)]"
        >
          AI made it easier than ever to build fast.{" "}
          <span className="text-zinc-500">
            But speed means little if you&apos;re{" "}
          </span>
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            building the wrong thing.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.25, ease }}
          className="text-zinc-500 text-base sm:text-lg max-w-xl leading-relaxed"
        >
          Glance is your AI product compass — helping teams decide what to build
          next, and what not to.
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.35, ease }}
          onClick={onCTA}
          disabled={signingIn}
          className="bg-white text-black hover:bg-zinc-200 transition-colors font-mono font-semibold text-sm h-12 px-8 rounded-full flex items-center gap-2 disabled:opacity-50"
        >
          {signingIn ? "Signing in..." : "Get Started Free"}
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.5, ease }}
          className="flex items-center gap-6 sm:gap-10 mt-4"
        >
          {[
            { label: "Focus", value: "More" },
            { label: "Noise", value: "Less" },
            { label: "Ship", value: "Faster" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-white font-mono font-semibold text-sm">
                {stat.value}
              </span>
              <span className="text-zinc-600 uppercase tracking-[0.15em] text-[10px] font-mono">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
