import "server-only";
import { z } from "zod";
import { getEnv } from "./env";
import type { Location } from "@/domain/types";

const coordinate = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
const geocodingSchema = z.object({
  status: z.string(),
  results: z
    .array(
      z.object({
        formatted_address: z.string(),
        partial_match: z.boolean().optional(),
        types: z.array(z.string()).default([]),
        address_components: z.array(
          z.object({
            long_name: z.string(),
            short_name: z.string(),
            types: z.array(z.string()),
          }),
        ),
        geometry: z.object({
          location: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
          }),
        }),
      }),
    )
    .default([]),
});
const suggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({ placeId: z.string(), text: z.object({ text: z.string() }) })
          .optional(),
      }),
    )
    .default([]),
});
const routeSchema = z.object({
  distanceMeters: z.number().nonnegative(),
  duration: z.string().regex(/^\d+(\.\d+)?s$/),
  polyline: z.object({
    geoJsonLinestring: z.object({ coordinates: z.array(coordinate).min(2) }),
  }),
});

function key() {
  const value = getEnv().googleMapsApiKey;
  if (!value) throw new Error("Google Maps is not configured.");
  return value;
}
async function googleRequest(
  url: string | URL,
  init: RequestInit = {},
  timeout = 12000,
) {
  const timeoutSignal = AbortSignal.timeout(timeout);
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: init.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal,
  });
  if (!response.ok) throw new Error("Google Maps is temporarily unavailable.");
  return response.json();
}

/** Search globally; preserve the place the user chooses instead of guessing from its name. */
export async function suggestLocations(
  query: string,
  signal?: AbortSignal,
): Promise<{ id: string; label: string }[]> {
  const text = query.trim();
  if (
    text.length < 3 ||
    text.length > 250 ||
    text.includes(";") ||
    text.split(/\s+/).length > 20
  )
    return [];
  const result = suggestionsSchema.parse(
    await googleRequest(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key(),
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
        },
        body: JSON.stringify({
          input: text,
          languageCode: "en",
          includeQueryPredictions: false,
        }),
      },
      6000,
    ),
  );
  const seen = new Set<string>();
  return result.suggestions
    .flatMap(({ placePrediction: p }) => {
      if (
        !p ||
        !p.text.text.trim() ||
        p.text.text.length > 250 ||
        seen.has(p.placeId)
      )
        return [];
      seen.add(p.placeId);
      return [{ id: p.placeId, label: p.text.text }];
    })
    .slice(0, 5);
}

export async function geocode(
  query: string,
  placeId?: string,
): Promise<Location | null> {
  const text = query.trim().slice(0, 250);
  if (!text || !getEnv().googleMapsApiKey) return null;
  // Never assign precise coordinates to an unspecified generic landmark.
  if (
    !placeId &&
    /^(?:the )?(?:market (?:junction|road)|main (?:road|market)|(?:old |new )?bridge|filling station|junction)$/i.test(
      text,
    )
  )
    return null;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.search = new URLSearchParams({
      key: key(),
      language: "en",
      ...(placeId ? { place_id: placeId } : { address: text }),
    }).toString();
    const result = geocodingSchema.parse(await googleRequest(url));
    if (result.status !== "OK" || result.results.length !== 1) return null;
    const top = result.results[0];
    if (top.partial_match) return null;
    const words = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N} ]/gu, " ")
        .split(/\s+/)
        .filter(Boolean);
    if (!placeId) {
      const queryWords = words(text).filter(
        (w) =>
          !["near", "at", "around", "the", "in", "for", "nigeria"].includes(w),
      );
      const addressWords = words(top.formatted_address);
      if (queryWords.some((w) => !addressWords.includes(w))) return null;
      // A district name must not silently resolve to a similarly named road.
      if (top.types.includes("route")) {
        const routeName =
          top.address_components.find((c) => c.types.includes("route"))
            ?.long_name || "";
        if (words(routeName).some((w) => !queryWords.includes(w))) return null;
      }
    }
    return {
      raw: text,
      normalizedLabel: top.formatted_address,
      longitude: top.geometry.location.lng,
      latitude: top.geometry.location.lat,
    };
  } catch {
    return null;
  }
}

export class RouteLocationError extends Error {}

async function resolveRouteEndpoint(label: string, selectedPlaceId?: string) {
  let placeId = selectedPlaceId;
  if (!placeId) {
    // Pasted labels and forms restored after a refresh may not carry a place ID.
    // Recover only a unique full-label match; never pick the first fuzzy result.
    const normalize = (value: string) =>
      value.trim().replace(/\s+/g, " ").toLowerCase();
    const suggestions = await suggestLocations(label).catch(() => []);
    const matches = suggestions.filter(
      (place) => normalize(place.label) === normalize(label),
    );
    if (matches.length === 1) placeId = matches[0].id;
  }
  return { placeId, location: await geocode(label, placeId) };
}

export async function directions(
  origin: string,
  destination: string,
  places: { originPlaceId?: string; destinationPlaceId?: string } = {},
): Promise<{
  geometry: [number, number][];
  origin: string;
  destination: string;
  distanceMeters: number;
  durationSeconds: number;
  alternatives: {
    geometry: [number, number][];
    distanceMeters: number;
    durationSeconds: number;
  }[];
}> {
  if (!getEnv().googleMapsApiKey)
    throw new Error(
      "Routes are unavailable without Google Maps configuration. Demo mode does not simulate road directions.",
    );
  const [from, to] = await Promise.all([
    resolveRouteEndpoint(origin, places.originPlaceId),
    resolveRouteEndpoint(destination, places.destinationPlaceId),
  ]);
  if (!from.location || !to.location)
    throw new RouteLocationError(
      "Could not identify both route endpoints unambiguously. Select a suggestion or add the town, state, or full address.",
    );
  const parsed = z.object({ routes: z.array(routeSchema).default([]) }).parse(
    await googleRequest(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key(),
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.polyline.geoJsonLinestring",
        },
        body: JSON.stringify({
          origin: from.placeId
            ? { placeId: from.placeId }
            : {
                location: {
                  latLng: {
                    latitude: from.location.latitude,
                    longitude: from.location.longitude,
                  },
                },
              },
          destination: to.placeId
            ? { placeId: to.placeId }
            : {
                location: {
                  latLng: {
                    latitude: to.location.latitude,
                    longitude: to.location.longitude,
                  },
                },
              },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          computeAlternativeRoutes: true,
          polylineEncoding: "GEO_JSON_LINESTRING",
          polylineQuality: "HIGH_QUALITY",
          languageCode: "en",
          units: "METRIC",
        }),
      },
    ),
  );
  if (!parsed.routes.length)
    throw new Error("No driving route is available for these endpoints.");
  const [primary, ...alternatives] = parsed.routes;
  const convert = (route: z.infer<typeof routeSchema>) => ({
    geometry: route.polyline.geoJsonLinestring.coordinates,
    distanceMeters: route.distanceMeters,
    durationSeconds: Number.parseFloat(route.duration),
  });
  return {
    ...convert(primary),
    origin: from.location.normalizedLabel || origin,
    destination: to.location.normalizedLabel || destination,
    alternatives: alternatives.map(convert),
  };
}
