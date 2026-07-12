"use client";

import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import { Radar, BarChart3, Ban, Users } from "lucide-react";
import { type MouseEvent, type ReactNode, useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

interface BentoCardProps {
  className?: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: ReactNode;
  visual?: ReactNode;
  glowColor?: string;
}

function BentoCard({
  className = "",
  eyebrow,
  title,
  body,
  icon,
  visual,
  glowColor = "rgba(255,255,255,0.06)",
}: BentoCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  const background = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${glowColor}, transparent 80%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease }}
      className={`group relative bg-[#0A0A0A] border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors ${className}`}
    >
      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background }}
      />

      {/* Top edge glow */}
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

      <div className="relative z-10 p-8 flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center">
              {icon}
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
              {eyebrow}
            </p>
          </div>
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
        {visual && <div className="mt-auto pt-4">{visual}</div>}
      </div>
    </motion.div>
  );
}

function SignalVisual() {
  return (
    <div className="flex items-center justify-center h-16">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-emerald-500/20"
          initial={{ width: 20, height: 20, opacity: 0.6 }}
          animate={{
            width: [20, 60 + i * 30],
            height: [20, 60 + i * 30],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2.5,
            delay: i * 0.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
      <div className="w-3 h-3 rounded-full bg-emerald-500" />
    </div>
  );
}

function BarChartVisual() {
  const heights = [60, 85, 45];
  const colors = ["bg-emerald-500/60", "bg-emerald-400/80", "bg-emerald-500/40"];

  return (
    <div className="flex items-end gap-2 h-16">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={`w-6 rounded-t ${colors[i]}`}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: i * 0.15, ease }}
        />
      ))}
    </div>
  );
}

function TeamVisual() {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-[11px] font-mono px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-400/70 bg-emerald-500/5">
        Engineering
      </span>
      <span className="text-[11px] font-mono px-3 py-1 rounded-full border border-cyan-500/30 text-cyan-400/70 bg-cyan-500/5">
        Product
      </span>
      <span className="text-[11px] font-mono px-3 py-1 rounded-full border border-indigo-500/30 text-indigo-400/70 bg-indigo-500/5">
        Design
      </span>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section className="px-4 py-20 sm:py-28 border-t border-zinc-800/50">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-14"
        >
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-600 mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] text-white font-[family-name:var(--font-bricolage-grotesque)]">
            From chaos to{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              compass
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 sm:gap-4">
          <BentoCard
            className="md:col-span-4 min-h-[280px]"
            eyebrow="Always listening"
            title="Signal Detection"
            body="Glance surfaces what your users actually want, cutting through the noise of feature requests and internal wishlists."
            icon={<Radar className="w-5 h-5 text-emerald-400" />}
            glowColor="rgba(16,185,129,0.08)"
            visual={<SignalVisual />}
          />
          <BentoCard
            className="md:col-span-2 min-h-[280px]"
            eyebrow="Prioritize"
            title="Priority Matrix"
            body="Stack-rank your backlog by impact vs effort, automatically."
            icon={<BarChart3 className="w-5 h-5 text-zinc-400" />}
            visual={<BarChartVisual />}
          />
          <BentoCard
            className="md:col-span-2 min-h-[240px]"
            eyebrow="Cut the noise"
            title="The No List"
            body="Sometimes the best decision is to not build. Glance helps you say no with confidence."
            icon={<Ban className="w-5 h-5 text-zinc-400" />}
          />
          <BentoCard
            className="md:col-span-4 min-h-[240px]"
            eyebrow="Collaborate"
            title="One Source of Truth"
            body="Entire team sees the same compass. No more conflicting roadmaps in 5 different tools."
            icon={<Users className="w-5 h-5 text-zinc-400" />}
            visual={<TeamVisual />}
          />
        </div>
      </div>
    </section>
  );
}
