import { z } from "zod";
import { api } from "@/server/http";
import { answer } from "@/server/services";
export const maxDuration = 60;
export const POST = api(async (request) => {
  const { question, incidentId } = z
    .object({
      question: z.string().trim().min(3).max(1500),
      incidentId: z.string().uuid().optional(),
    })
    .parse(await request.json());
  return answer(question, incidentId);
}, 15);
