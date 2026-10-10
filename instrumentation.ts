import type { Instrumentation } from "next";

/**
 * Server errors as one JSON line each (searchable in the host's logs) and,
 * when ERROR_WEBHOOK_URL is set (Slack/Discord/Telegram-style webhook), a short
 * alert. Query strings are dropped: manage links carry a token there.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  const entry = {
    level: "error",
    message: error.message,
    digest,
    path: request.path.split("?")[0],
    method: request.method,
    route: context.routePath,
    kind: context.routerKind === "App Router" ? context.routeType : context.routerKind,
    stack: error.stack?.split("\n").slice(0, 6).join("\n"),
  };
  console.error(JSON.stringify(entry));

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: `⚠️ ${entry.method} ${entry.path} (${entry.route}): ${entry.message}${digest ? ` [${digest}]` : ""}` }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
};
