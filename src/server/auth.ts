import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
function sign(value: string) {
  return createHmac(
    "sha256",
    getEnv().sessionSecret || "explicit-local-demo-only",
  )
    .update(value)
    .digest("base64url");
}
export function secureEqual(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export async function isCoordinator() {
  const token = (await cookies()).get("sc-coordinator")?.value;
  if (!token || token.split(".").length !== 2) return false;
  const [expiry, signature] = token.split(".");
  return (
    !!signature &&
    Number(expiry) > Date.now() &&
    secureEqual(sign(expiry), signature)
  );
}
export async function requireCoordinator() {
  if (!(await isCoordinator()))
    throw new HttpError("Coordinator sign-in is required.", 401);
}
export async function login(password?: string, demo?: boolean) {
  const env = getEnv();
  if (
    !(env.demoMode && demo) &&
    (!env.coordinatorPassword ||
      !password ||
      !secureEqual(password, env.coordinatorPassword))
  )
    throw new HttpError("Incorrect coordinator access code.", 401);
  const expiry = String(Date.now() + 8 * 3600000);
  (await cookies()).set("sc-coordinator", expiry + "." + sign(expiry), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function logout() {
  (await cookies()).delete("sc-coordinator");
}
export async function sourceIdentity() {
  const jar = await cookies();
  let identity = jar.get("sc-source")?.value;
  if (
    !identity ||
    !/^[-a-zA-Z0-9_.]+$/.test(identity) ||
    identity.length > 200
  ) {
    identity = undefined;
  }
  if (identity && identity.split(".").length !== 2) identity = undefined;
  if (identity) {
    const [id, sig] = identity.split(".");
    if (!sig || !secureEqual(sign(id), sig)) identity = undefined;
  }
  if (!identity) {
    const id = randomUUID();
    identity = id + "." + sign(id);
    jar.set("sc-source", identity, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 365 * 86400,
    });
  }
  return createHmac(
    "sha256",
    getEnv().sessionSecret || "explicit-local-demo-only",
  )
    .update(identity)
    .digest("hex");
}
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
