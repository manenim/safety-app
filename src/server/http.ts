import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";
import { MediaValidationError } from "@/lib/validation";
const buckets = new Map<string, { count: number; until: number }>();
export function guardRequest(request: Request, limit = 30) {
  const origin = request.headers.get("origin");
  if (origin) {
    const url = new URL(request.url);
    // Next can construct request.url from its internal bind address. Compare
    // against the browser-facing authority instead. Reverse proxies must
    // overwrite forwarded headers rather than append untrusted client values.
    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      url.host;
    const protocol =
      request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
    let expectedOrigin: string | undefined;
    if (/^https?$/.test(protocol) && !/[\s,/@?#\\%]/.test(host)) {
      try {
        expectedOrigin = new URL(`${protocol}://${host}`).origin;
      } catch {
        // Malformed authorities fail closed, without exposing parser errors.
      }
    }
    if (!expectedOrigin || origin !== expectedOrigin)
      throw new HttpError("Cross-origin requests are not allowed.", 403);
  }
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 11 * 1024 * 1024)
    throw new HttpError("Request exceeds the 10 MB upload limit.", 413);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const key = ip + ":" + new URL(request.url).pathname;
  const now = Date.now();
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  let bucket = buckets.get(key);
  if (!bucket || bucket.until < now) {
    bucket = { count: 0, until: now + 60000 };
    buckets.set(key, bucket);
  }
  if (++bucket.count > limit)
    throw new HttpError(
      "Too many requests. Please try again in a minute.",
      429,
    );
}
export function api(
  handler: (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => Promise<unknown>,
  limit = 30,
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      if (request.method !== "GET") guardRequest(request, limit);
      return NextResponse.json(await handler(request, context), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      if (error instanceof MediaValidationError)
        return NextResponse.json({ error: error.message }, { status: 400 });
      if (error instanceof SyntaxError)
        return NextResponse.json(
          { error: "Invalid request body." },
          { status: 400 },
        );
      if (error instanceof ZodError)
        return NextResponse.json(
          { error: error.issues.map((i) => i.message).join(" ") },
          { status: 400 },
        );
      if (error instanceof HttpError)
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      console.error(
        JSON.stringify({
          event: "request_failed",
          path: new URL(request.url).pathname,
          errorType: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      return NextResponse.json(
        {
          error:
            "The service could not complete this request. Your saved reports are retained. Please try again.",
        },
        { status: 503 },
      );
    }
  };
}
export function log(
  event: string,
  data: Record<string, string | number | boolean | null> = {},
) {
  console.info(JSON.stringify({ event, ...data }));
}
