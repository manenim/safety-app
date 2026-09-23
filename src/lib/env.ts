import "server-only";
import { z } from "zod";
const schema = z.object({
  demoMode: z.boolean(),
  openaiKey: z.string().optional(),
  supabaseUrl: z.string().url().optional(),
  supabaseKey: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
  coordinatorPassword: z.string().optional(),
  sessionSecret: z.string().optional(),
  model: z.string(),
  transcriptionModel: z.string(),
});
export function getEnv() {
  const env = schema.parse({
    demoMode: process.env.SIGNALCHECK_DEMO_MODE === "true",
    openaiKey: process.env.OPENAI_API_KEY,
    supabaseUrl:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      undefined,
    supabaseKey:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    coordinatorPassword: process.env.COORDINATOR_PASSWORD,
    sessionSecret: process.env.SESSION_SECRET,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    transcriptionModel:
      process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  });
  if (!env.demoMode) {
    const missing = [
      !env.openaiKey && "OPENAI_API_KEY",
      !env.supabaseUrl && "SUPABASE_URL",
      !env.supabaseKey && "SUPABASE_SECRET_KEY",
      !env.coordinatorPassword && "COORDINATOR_PASSWORD",
      !env.sessionSecret && "SESSION_SECRET",
    ].filter(Boolean);
    if (missing.length)
      throw new Error(
        `Missing required configuration: ${missing.join(", ")}. See .env.example or explicitly enable SIGNALCHECK_DEMO_MODE.`,
      );
  }
  return env;
}
