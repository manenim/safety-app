import { z } from "zod";
import { api } from "@/server/http";
import { login } from "@/server/auth";
export const POST = api(async (request) => {
  const { password, demo } = z
    .object({
      password: z.string().max(250).optional(),
      demo: z.boolean().optional(),
    })
    .parse(await request.json());
  await login(password, demo);
  return { ok: true };
}, 5);
