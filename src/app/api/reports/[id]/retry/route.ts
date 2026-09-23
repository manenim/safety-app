import { api } from "@/server/http";
import { retryReport } from "@/server/services";
import { sourceIdentity } from "@/server/auth";
export const maxDuration = 120;
export const POST = api(
  async (_, context) =>
    retryReport((await context.params).id, await sourceIdentity()),
  5,
);
