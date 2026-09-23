import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const config = vi.hoisted(() => ({
  googleMapsApiKey: "test-token" as string | undefined,
}));
vi.mock("../src/lib/env", () => ({ getEnv: () => config }));
import { suggestLocations } from "../src/lib/maps";
import { GET } from "../src/app/api/locations/suggest/route";
const feature = (name: string, address = `${name}, Lagos, Nigeria`) => ({
  placePrediction: { placeId: name, text: { text: address } },
});
beforeEach(() => {
  config.googleMapsApiKey = "test-token";
});
afterEach(() => vi.unstubAllGlobals());

describe("location suggestions", () => {
  it("requests real autocomplete and returns distinct readable locations without exposing the token", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [feature("Ikeja"), feature("Ikeja"), feature("Ikoyi")],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await suggestLocations(" Ikej ")).toEqual([
      { id: "Ikeja", label: "Ikeja, Lagos, Nigeria" },
      { id: "Ikoyi", label: "Ikoyi, Lagos, Nigeria" },
    ]);
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe(
      "https://places.googleapis.com/v1/places:autocomplete",
    );
    const body = JSON.parse(options.body);
    expect(body.input).toBe("Ikej");
    expect(body).not.toHaveProperty("includedRegionCodes");
    expect(body).not.toHaveProperty("locationRestriction");
    expect(body).not.toHaveProperty("regionCode");
    expect(options.headers["X-Goog-Api-Key"]).toBe("test-token");
    expect(options.cache).toBe("no-store");
  });
  it("does not send short or invalid queries to the provider", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await suggestLocations("Ik")).toEqual([]);
    expect(await suggestLocations("Ikeja; Lagos")).toEqual([]);
    expect(await suggestLocations("A".repeat(251))).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("fails gracefully when the provider is not configured", async () => {
    config.googleMapsApiKey = undefined;
    const response = await GET(
      new Request("http://localhost/api/locations/suggest?q=Ikeja"),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        "Location suggestions are unavailable. You can still enter a location.",
    });
  });
  it("validates the public endpoint and keeps responses out of caches", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ suggestions: [feature("Ikeja")] })),
      );
    vi.stubGlobal("fetch", fetcher);
    const context = { params: Promise.resolve({}) };
    expect(
      (
        await GET(
          new Request("http://localhost/api/locations/suggest?q=ab"),
          context,
        )
      ).status,
    ).toBe(400);
    const result = await GET(
      new Request("http://localhost/api/locations/suggest?q=Ikeja"),
      context,
    );
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(await result.json()).toEqual({
      suggestions: [{ id: "Ikeja", label: "Ikeja, Lagos, Nigeria" }],
    });
  });
  it("does not fabricate suggestions when the provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })),
    );
    await expect(suggestLocations("Ikeja")).rejects.toThrow("unavailable");
  });
});
