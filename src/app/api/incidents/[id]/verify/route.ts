import { api } from "@/server/http";
import { requestVerification } from "@/server/services";
import { requireCoordinator } from "@/server/auth";
export const POST = api(async (_, context) => {
  await requireCoordinator();
  return { request: await requestVerification((await context.params).id) };
});
