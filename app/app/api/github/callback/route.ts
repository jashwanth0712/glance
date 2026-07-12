import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";

/**
 * GitHub redirects here after a user installs the GitHub App. We resolve the
 * installation's account and persist it for the signed-in user, then send
 * them to the onboarding screen to pick repos + backfill window.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const installationIdParam = url.searchParams.get("installation_id");
  const origin = url.origin;

  if (!installationIdParam) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  try {
    const token = await convexAuthNextjsToken();
    await fetchAction(
      api.github.ingest.registerInstallation,
      { installationId: Number(installationIdParam) },
      { token },
    );
  } catch (err) {
    console.error("Failed to register installation", err);
    return NextResponse.redirect(
      new URL("/dashboard?github=error", origin),
    );
  }

  return NextResponse.redirect(
    new URL(`/dashboard/onboarding?installed=1`, origin),
  );
}
