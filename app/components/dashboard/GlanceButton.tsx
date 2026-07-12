"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Telescope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlanceDrawer, type WindowKey } from "./GlanceDrawer";

export function GlanceButton({
  repoId,
  repoName,
}: {
  repoId: string;
  repoName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [windowKey, setWindowKey] = useState<WindowKey>("1w");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5"
      >
        <Telescope className="h-3.5 w-3.5" />
        Glance
      </Button>

      <AnimatePresence>
        {isOpen && (
          <GlanceDrawer
            repoId={repoId}
            repoName={repoName}
            windowKey={windowKey}
            onWindowChange={setWindowKey}
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
