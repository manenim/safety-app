import { api } from "@/server/http";
import { getIncident } from "@/server/services";
export const GET = api(async (_, context) => ({
  incident: await getIncident((await context.params).id),
}));
