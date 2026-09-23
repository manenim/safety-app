import { api } from "@/server/http";
import { getEnv } from "@/lib/env";
export const GET = api(async () => ({ ok: true, demoMode: getEnv().demoMode }));
