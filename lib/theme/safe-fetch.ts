import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetching arbitrary user-supplied URLs from the server is an SSRF risk, so
// every hop (including redirects) is checked against private address ranges.

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 BookingWidgetThemeBot/0.1";

export class FetchError extends Error {}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

// Local sites (e.g. /demo.html) are allowed while developing only.
const ALLOW_PRIVATE = process.env.NODE_ENV === "development";

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchError("Only http(s) URLs are supported.");
  }
  if (ALLOW_PRIVATE) return;
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new FetchError("That address isn't publicly reachable.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!addresses.length) throw new FetchError(`Couldn't resolve ${url.hostname}.`);
  if (addresses.some(isPrivateIp)) throw new FetchError("That address isn't publicly reachable.");
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const buf = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    const slice = c.subarray(0, Math.max(0, buf.length - offset));
    buf.set(slice, offset);
    offset += slice.length;
  }
  return new TextDecoder().decode(buf);
}

export async function safeFetchText(
  input: string | URL,
  { maxBytes = 1_500_000, accept = "text/html,*/*" } = {},
): Promise<{ text: string; finalUrl: URL; contentType: string }> {
  let url = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((err: unknown) => {
      throw new FetchError(
        err instanceof Error && err.name === "TimeoutError"
          ? "The site took too long to respond."
          : "Couldn't reach that site.",
      );
    });

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) throw new FetchError(`The site responded with ${res.status}.`);
    return {
      text: await readCapped(res, maxBytes),
      finalUrl: url,
      contentType: res.headers.get("content-type") ?? "",
    };
  }
  throw new FetchError("Too many redirects.");
}
