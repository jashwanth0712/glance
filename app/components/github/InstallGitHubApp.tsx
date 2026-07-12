"use client";

import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallGitHubApp({
  label = "Connect GitHub",
}: {
  label?: string;
}) {
  const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
  const href = appName
    ? `https://github.com/apps/${appName}/installations/new`
    : undefined;

  if (!href) {
    return (
      <p className="text-xs font-mono text-red-400">
        NEXT_PUBLIC_GITHUB_APP_NAME is not configured.
      </p>
    );
  }

  return (
    <Button asChild>
      <a href={href}>
        <GitBranch className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
