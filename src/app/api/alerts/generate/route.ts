import { api } from "@/server/http";
import { alertFor } from "@/server/services";
import { requireCoordinator } from "@/server/auth";
import { alertSchema } from "@/lib/validation";
export const maxDuration = 60;
export const POST = api(async (request) => {
  await requireCoordinator();
  const { incidentId, ...options } = alertSchema.parse(await request.json());
  return { alert: await alertFor(incidentId, options) };
}, 10);
