import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { FetchError, isPrivateIp, safeFetchText } = await import("./safe-fetch");

describe("isPrivateIp", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "64:ff9b::a9fe:a9fe",
    "2002:7f00:1::",
    "not-an-ip",
  ])("blocks %s", (ip) => expect(isPrivateIp(ip)).toBe(true));

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) =>
    expect(isPrivateIp(ip)).toBe(false),
  );
});

describe("safeFetchText", () => {
  it.each([
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:3000/",
    "ftp://example.com/",
    "http://user:pass@example.com/",
  ])("refuses %s before connecting", async (url) => {
    await expect(safeFetchText(url)).rejects.toBeInstanceOf(FetchError);
  });
});
