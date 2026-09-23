import { api } from "@/server/http";
import { dashboard } from "@/server/services";
import { isCoordinator } from "@/server/auth";
export const GET = api(async () => dashboard(await isCoordinator()));
