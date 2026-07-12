"use client";

import { motion } from "framer-motion";
import { Compass, Menu, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface NavbarProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  signingIn: boolean;
  onSignIn: () => void;
}

export default function Navbar({
  isAuthenticated,
  isLoading,
  signingIn,
  onSignIn,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 left-0 right-0 z-50 px-4"
    >
      <nav className="max-w-4xl mx-auto bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="font-mono font-medium tracking-tight text-sm">
            Glance
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          {isLoading ? (
            <div className="h-8 w-24 rounded-full bg-zinc-800/50 animate-pulse" />
          ) : isAuthenticated ? (
            <Link
              href="/dashboard"
              className="font-mono text-xs bg-white text-black hover:bg-zinc-200 transition-colors rounded-full px-5 py-2 font-semibold"
            >
              Dashboard
            </Link>
          ) : (
            <button
              onClick={onSignIn}
              disabled={signingIn}
              className="font-mono text-xs bg-white text-black hover:bg-zinc-200 transition-colors rounded-full px-5 py-2 font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              <GoogleIcon />
              {signingIn ? "Signing in..." : "Get Started"}
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden text-zinc-400 hover:text-white transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="sm:hidden mt-2 max-w-4xl mx-auto bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4"
        >
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="block w-full text-center font-mono text-xs bg-white text-black rounded-full px-5 py-2.5 font-semibold"
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </Link>
          ) : (
            <button
              onClick={() => {
                onSignIn();
                setMobileOpen(false);
              }}
              disabled={signingIn}
              className="w-full font-mono text-xs bg-white text-black rounded-full px-5 py-2.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <GoogleIcon />
              {signingIn ? "Signing in..." : "Get Started"}
            </button>
          )}
        </motion.div>
      )}
    </motion.header>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
