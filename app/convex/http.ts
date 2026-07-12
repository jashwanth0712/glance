import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Verify GitHub's X-Hub-Signature-256 HMAC using Web Crypto (V8 runtime).
async function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const bytes = new Uint8Array(mac);
  const expected =
    "sha256=" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  // Constant-time-ish comparison.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

http.route({
  path: "/github/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return new Response("Not configured", { status: 500 });

    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    if (!(await verifySignature(rawBody, signature, secret))) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = request.headers.get("x-github-event") ?? "unknown";
    const deliveryId = request.headers.get("x-github-delivery") ?? crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = JSON.parse(rawBody);
    const action: string | undefined = payload.action;

    const dedupe = await ctx.runMutation(
      internal.github.webhookHandler.logWebhookEvent,
      {
        deliveryId,
        event,
        action,
        installationId: payload.installation?.id,
        repoFullName: payload.repository?.full_name,
      },
    );
    if (dedupe.alreadyProcessed) return new Response("ok", { status: 200 });

    // Route by event type. Each handler schedules downstream work.
    switch (event) {
      case "installation":
        await ctx.runMutation(
          internal.github.webhookHandler.handleInstallation,
          { action: action ?? "", payload },
        );
        break;
      case "installation_repositories":
        await ctx.runMutation(
          internal.github.webhookHandler.handleInstallationRepositories,
          { action: action ?? "", payload },
        );
        break;
      case "push":
        await ctx.runMutation(internal.github.webhookHandler.handlePushEvent, {
          payload,
        });
        break;
      case "pull_request":
        await ctx.runMutation(
          internal.github.webhookHandler.handlePullRequestEvent,
          { action: action ?? "", payload },
        );
        break;
      default:
        break;
    }

    await ctx.runMutation(internal.github.webhookHandler.markWebhookProcessed, {
      deliveryId,
    });
    return new Response("ok", { status: 200 });
  }),
});

export default http;
