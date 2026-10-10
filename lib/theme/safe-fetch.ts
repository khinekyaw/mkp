import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

// Fetching arbitrary user-supplied URLs from the server is an SSRF risk. Every
// hop (including redirects) is checked, and the check happens inside the DNS
// lookup the socket actually uses, so a hostname can't resolve to a public
// address for the check and a private one for the connection (DNS rebinding).

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 BookingWidgetThemeBot/0.1";

export class FetchError extends Error {}

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16],
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3], // multicast and reserved, through 255.255.255.255
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128],
  ["64:ff9b::", 96], // NAT64 (embeds an IPv4 address)
  ["64:ff9b:1::", 48],
  ["100::", 64], // discard
  ["2001::", 32], // Teredo
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4 (embeds an IPv4 address)
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

/** True for loopback, private, link-local and other non-public addresses (IPv4-mapped IPv6 included). */
export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (!family) return true;
  return blocked.check(ip, family === 6 ? "ipv6" : "ipv4");
}

// Local sites (e.g. /demo.html) are allowed while developing only.
const ALLOW_PRIVATE = process.env.NODE_ENV === "development";

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/** dns.lookup that refuses to hand a private address to the socket. */
function guardedLookup(hostname: string, options: { all?: boolean; family?: number }, callback: LookupCallback) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    if (!ALLOW_PRIVATE && addresses.some((a) => isPrivateIp(a.address))) {
      return callback(new FetchError("That address isn't publicly reachable."), []);
    }
    if (options.all) return callback(null, addresses);
    const first = addresses[0];
    if (!first) return callback(new FetchError(`Couldn't resolve ${hostname}.`), []);
    callback(null, first.address, first.family);
  });
}

const agent = new Agent({ connect: { lookup: guardedLookup as never, timeout: TIMEOUT_MS } });

/** Cheap checks before connecting; hostnames are checked again at connect time by the lookup. */
function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchError("Only http(s) URLs are supported.");
  }
  if (url.username || url.password) throw new FetchError("URLs with credentials aren't supported.");
  if (ALLOW_PRIVATE) return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchError("That address isn't publicly reachable.");
  }
  // IP literals never reach the DNS lookup, so check them here.
  if (isIP(host) && isPrivateIp(host)) throw new FetchError("That address isn't publicly reachable.");
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

/** The FetchError thrown by the guarded lookup arrives wrapped as the fetch error's cause. */
function rootFetchError(err: unknown): FetchError | null {
  for (let e = err; e instanceof Error; e = e.cause) if (e instanceof FetchError) return e;
  return null;
}

export async function safeFetchText(
  input: string | URL,
  { maxBytes = 1_500_000, accept = "text/html,*/*" } = {},
): Promise<{ text: string; finalUrl: URL; contentType: string }> {
  let url = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertPublicUrl(url);
    const res = (await undiciFetch(url, {
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      dispatcher: agent,
    }).catch((err: unknown) => {
      throw (
        rootFetchError(err) ??
        new FetchError(
          err instanceof Error && err.name === "TimeoutError" ? "The site took too long to respond." : "Couldn't reach that site.",
        )
      );
    })) as unknown as Response;

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
