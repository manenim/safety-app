import { api } from "@/server/http";
import { ownedReport } from "@/server/services";
import { sourceIdentity } from "@/server/auth";
export const GET = api(async (_, context) => ({
  report: await ownedReport((await context.params).id, await sourceIdentity()),
}));
