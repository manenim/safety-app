import { afterEach, expect, it, vi } from "vitest";
vi.mock("../src/lib/env", () => ({
  getEnv: () => ({ googleMapsApiKey: "test-key" }),
}));
import { directions } from "../src/lib/maps";
afterEach(() => vi.unstubAllGlobals());
const origin = "Airport Road, Lugbe, Nigeria";
const destination =
  "Infostrategy Technology Nigeria Limited, Madiana Close, off Dar-Es-Salam Street, Abuja, Nigeria";
const fromId = "airport-road";
const toId = "infostrategy";
const geo = (address: string) => ({
  status: "OK",
  results: [
    {
      formatted_address: address,
      types: ["route"],
      address_components: [
        { long_name: address, short_name: address, types: ["route"] },
      ],
      geometry: { location: { lat: 9.0, lng: 7.4 } },
    },
  ],
});

it("recovers exact autocomplete place IDs when full labels arrive as plain text", async () => {
  const routeBodies: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, options?: RequestInit) => {
      const address = String(url);
      if (address.includes("places:autocomplete")) {
        const query = JSON.parse(options!.body as string).input;
        return Response.json({
          suggestions: [
            {
              placePrediction: {
                placeId: query === origin ? fromId : toId,
                text: { text: query },
              },
            },
          ],
        });
      }
      if (address.includes("geocode")) {
        const id = new URL(address).searchParams.get("place_id");
        return Response.json(
          geo(
            id === fromId
              ? "Airport Rd, Lugbe, Nigeria"
              : "4 Madiana Close, Abuja, Nigeria",
          ),
        );
      }
      routeBodies.push(JSON.parse(options!.body as string));
      return Response.json({
        routes: [
          {
            distanceMeters: 21350,
            duration: "1255s",
            polyline: {
              geoJsonLinestring: {
                coordinates: [
                  [7.36, 8.97],
                  [7.47, 9.07],
                ],
              },
            },
          },
        ],
      });
    }),
  );
  const result = await directions(origin, destination);
  expect(result.distanceMeters).toBe(21350);
  expect(routeBodies[0]).toMatchObject({
    origin: { placeId: fromId },
    destination: { placeId: toId },
  });
});

it("does not silently choose a different or ambiguous suggestion", async () => {
  const routeRequests: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const address = String(url);
      if (address.includes("places:autocomplete"))
        return Response.json({
          suggestions: [
            {
              placePrediction: {
                placeId: "one",
                text: { text: "Airport Road, Different City" },
              },
            },
            {
              placePrediction: {
                placeId: "two",
                text: { text: "Airport Road, Another City" },
              },
            },
          ],
        });
      if (address.includes("geocode"))
        return Response.json({ status: "ZERO_RESULTS", results: [] });
      routeRequests.push(address);
      return Response.json({ routes: [] });
    }),
  );
  await expect(directions(origin, destination)).rejects.toThrow(
    "Select a suggestion",
  );
  expect(routeRequests).toHaveLength(0);
});
