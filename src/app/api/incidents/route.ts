import { api } from "@/server/http";
import { listIncidents } from "@/server/services";
import { getEnv } from "@/lib/env";
export const GET = api(async () => ({
  incidents: await listIncidents(),
  demoMode: getEnv().demoMode,
}));
