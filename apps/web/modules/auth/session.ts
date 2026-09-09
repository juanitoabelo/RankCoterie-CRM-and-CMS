/**
 * Auth Module — Session Management
 * 
 * Handles session creation, reading, and destruction using signed httpOnly cookies.
 */
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  encodeSessionPayload,
  signSessionToken,
  readSessionValue,
} from "@/lib/session-token";
import type { SessionPayload } from "./types";

export { SESSION_COOKIE, SESSION_TTL_SECONDS };

/** Create a session for a user and set it as an httpOnly cookie. */
export async function createSession(uid: string): Promise<void> {
  const payload = encodeSessionPayload({ uid, exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const sig = await signSessionToken(payload);
  const value = `${payload}.${sig}`;
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Read the current signed session from cookies; returns uid or null. */
export async function getSessionUid(): Promise<string | null> {
  const store = await cookies();
  return readSessionValue(store.get(SESSION_COOKIE)?.value);
}

/** Destroy the session cookie. */
export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
