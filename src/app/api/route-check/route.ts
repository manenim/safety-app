import { z } from "zod";
import { api } from "@/server/http";
import { routeCheck } from "@/server/services";
import { HttpError } from "@/server/auth";
import { RouteLocationError } from "@/lib/maps";
export const POST = api(async (request) => {
  const { origin, destination, originPlaceId, destinationPlaceId } = z
    .object({
      origin: z.string().trim().min(3).max(250),
      destination: z.string().trim().min(3).max(250),
      originPlaceId: z
        .string()
        .regex(/^[A-Za-z0-9_-]+$/)
        .max(300)
        .optional(),
      destinationPlaceId: z
        .string()
        .regex(/^[A-Za-z0-9_-]+$/)
        .max(300)
        .optional(),
    })
    .parse(await request.json());
  try {
    return await routeCheck(origin, destination, {
      originPlaceId,
      destinationPlaceId,
    });
  } catch (error) {
    if (error instanceof RouteLocationError)
      throw new HttpError(error.message, 400);
    throw new HttpError(
      "Route data is unavailable. Check the locations and try again. SignalCheck cannot assess this route without actual directions.",
      503,
    );
  }
}, 15);
