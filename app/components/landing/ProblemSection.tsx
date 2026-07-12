"use client";

import { motion } from "framer-motion";
import { MessageSquareX, RefreshCcw, Layers } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const problems = [
  {
    icon: MessageSquareX,
    title: "Building features nobody asked for",
    body: "AI makes it easy to say yes to everything. But just because you can build it in an hour doesn't mean you should.",
  },
  {
    icon: RefreshCcw,
    title: "Refactoring during launch week",
    body: "The auth layer doesn't need a rewrite right now. Your users need the feature you promised them last sprint.",
  },
  {
    icon: Layers,
    title: "Over-engineering the wrong layer",
    body: "Designing an internal API \"for scale\" while it handles 100 requests a day. Wrong problem, wrong time.",
  },
];

export default function ProblemSection() {
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
            The real problem
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] text-white font-[family-name:var(--font-bricolage-grotesque)]">
            Speed without direction{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              is just drift
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {problems.map((problem, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className="group relative bg-[#0A0A0A] border border-zinc-800/60 rounded-xl p-8 flex flex-col gap-4 hover:border-zinc-700 transition-colors"
            >
              {/* Top edge glow */}
              <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center">
                <problem.icon className="w-5 h-5 text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {problem.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {problem.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
