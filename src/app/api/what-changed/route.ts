import { z } from "zod";
import { api } from "@/server/http";
import { brief } from "@/server/services";
import { requireCoordinator } from "@/server/auth";
export const maxDuration = 60;
export const POST = api(async (request) => {
  await requireCoordinator();
  const { windowMinutes } = z
    .object({
      windowMinutes: z
        .union([z.literal(30), z.literal(60), z.literal(1440)])
        .default(60),
    })
    .parse(await request.json());
  return brief(windowMinutes, undefined, true);
}, 10);
