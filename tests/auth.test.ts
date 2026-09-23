import { beforeEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      state.cookies.has(key) ? { value: state.cookies.get(key)! } : undefined,
    set: (key: string, value: string) => state.cookies.set(key, value),
    delete: (key: string) => state.cookies.delete(key),
  }),
}));
vi.mock("../src/lib/env", () => ({
  getEnv: () => ({
    demoMode: false,
    sessionSecret: "unit-test-session-secret",
    coordinatorPassword: "test-code",
  }),
}));
import {
  isCoordinator,
  login,
  logout,
  sourceIdentity,
} from "../src/server/auth";
beforeEach(() => state.cookies.clear());
it("allows valid coordinator login and invalidates logout", async () => {
  await expect(login("wrong")).rejects.toThrow();
  await login("test-code");
  expect(await isCoordinator()).toBe(true);
  await logout();
  expect(await isCoordinator()).toBe(false);
});
it("rejects appended coordinator token data", async () => {
  await login("test-code");
  state.cookies.set(
    "sc-coordinator",
    state.cookies.get("sc-coordinator")! + ".extra",
  );
  expect(await isCoordinator()).toBe(false);
});
it("reuses a signed source but replaces tampered cookie rather than deriving unsigned identities", async () => {
  const first = await sourceIdentity();
  expect(await sourceIdentity()).toBe(first);
  const original = state.cookies.get("sc-source")!;
  state.cookies.set("sc-source", original + ".tampered");
  await sourceIdentity();
  expect(state.cookies.get("sc-source")!.split(".")).toHaveLength(2);
  expect(state.cookies.get("sc-source")).not.toBe(original + ".tampered");
});
it("does not allow demo coordinator login in live mode", async () => {
  await expect(login(undefined, true)).rejects.toThrow();
});
