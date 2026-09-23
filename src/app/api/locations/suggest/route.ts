import { z } from "zod";
import { api, guardRequest } from "@/server/http";
import { HttpError } from "@/server/auth";
import { suggestLocations } from "@/lib/maps";

export const GET = api(async (request) => {
  guardRequest(request, 90);
  const query = z
    .string()
    .trim()
    .min(3)
    .max(250)
    .refine(
      (value) => !value.includes(";") && value.split(/\s+/).length <= 20,
      "Use a shorter location name or address.",
    )
    .parse(new URL(request.url).searchParams.get("q"));
  try {
    return { suggestions: await suggestLocations(query, request.signal) };
  } catch {
    throw new HttpError(
      "Location suggestions are unavailable. You can still enter a location.",
      503,
    );
  }
});
