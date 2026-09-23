import { describe, expect, it } from "vitest";
import { guardRequest } from "../src/server/http";

function request(origin: string, headers: Record<string, string> = {}) {
  return new Request("http://0.0.0.0:3000/api/assistant", {
    method: "POST",
    headers: { origin, host: "localhost:3000", ...headers },
  });
}

describe("browser request origin validation", () => {
  it.each(["localhost:3000", "127.0.0.1:3000", "192.168.1.20:3000"])(
    "accepts same-origin requests to %s when Next uses its bind address",
    (host) =>
      expect(() =>
        guardRequest(request(`http://${host}`, { host })),
      ).not.toThrow(),
  );
  it("accepts the external HTTPS origin supplied by a reverse proxy", () => {
    expect(() =>
      guardRequest(
        request("https://signals.example.com", {
          host: "internal:3000",
          "x-forwarded-host": "signals.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).not.toThrow();
  });
  it.each([
    "https://attacker.example",
    "http://localhost:3001",
    "https://localhost:3000",
    "http://localhost:3000.attacker.example",
    "http://0.0.0.0:3000",
    "null",
    "http://localhost:3000/path",
    "http://localhost:3000@attacker.example",
  ])("rejects a different or invalid origin: %s", (origin) => {
    expect(() => guardRequest(request(origin))).toThrow(
      "Cross-origin requests are not allowed.",
    );
  });
  it("does not accept an internal origin when a proxy provides an external host", () => {
    expect(() =>
      guardRequest(
        request("http://localhost:3000", {
          "x-forwarded-host": "signals.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toThrow("Cross-origin requests are not allowed.");
  });
  it.each<Record<string, string>>([
    { "x-forwarded-host": "localhost:3000, attacker.example" },
    { "x-forwarded-host": "localhost:3000/path" },
    { "x-forwarded-proto": "http, https" },
  ])("rejects malformed forwarded authority %j", (headers) => {
    expect(() =>
      guardRequest(request("http://localhost:3000", headers)),
    ).toThrow("Cross-origin requests are not allowed.");
  });
  it("preserves support for non-browser clients without an Origin header", () => {
    expect(() =>
      guardRequest(
        new Request("http://localhost:3000/api/assistant", { method: "POST" }),
      ),
    ).not.toThrow();
  });
  it("uses the request URL when no host headers are present", () => {
    expect(() =>
      guardRequest(
        new Request("https://signals.example.com/api/assistant", {
          method: "POST",
          headers: { origin: "https://signals.example.com" },
        }),
      ),
    ).not.toThrow();
  });
});
