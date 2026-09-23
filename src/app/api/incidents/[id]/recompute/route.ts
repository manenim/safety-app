import { api } from "@/server/http";
import { getIncident } from "@/server/services";
import { requireCoordinator } from "@/server/auth";
export const POST = api(async (_, context) => {
  await requireCoordinator();
  return { incident: await getIncident((await context.params).id) };
});
