"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }
    setSigningIn(true);
    try {
      await signIn("google");
    } catch {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        signingIn={signingIn}
        onSignIn={handleSignIn}
      />
      <main>
        <HeroSection signingIn={signingIn} onCTA={handleSignIn} />
        <ProblemSection />
        <FeaturesSection />
        <CTASection signingIn={signingIn} onCTA={handleSignIn} />
      </main>
      <Footer />
    </div>
  );
}
