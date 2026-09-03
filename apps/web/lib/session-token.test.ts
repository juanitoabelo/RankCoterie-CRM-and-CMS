import { describe, expect, it } from "vitest";
import {
  encodeSessionPayload,
  decodeSessionPayload,
  readSessionValue,
  signSessionToken,
} from "./session-token";

const uid = "user_abc";

async function value(exp: number): Promise<string> {
  const payload = encodeSessionPayload({ uid, exp });
  const sig = await signSessionToken(payload);
  return `${payload}.${sig}`;
}

describe("session token", () => {
  it("round-trips a valid, unexpired token", async () => {
    const token = await value(Date.now() + 60_000);
    expect(await readSessionValue(token)).toBe(uid);
  });

  it("rejects an expired token", async () => {
    const token = await value(Date.now() - 1000);
    expect(await readSessionValue(token)).toBe(null);
  });

  it("rejects garbage, missing and malformed values", async () => {
    expect(await readSessionValue(undefined)).toBe(null);
    expect(await readSessionValue(null)).toBe(null);
    expect(await readSessionValue("not-a-token")).toBe(null);
    expect(await readSessionValue("payloadonly")).toBe(null);
  });

  it("rejects a token whose signature is tampered with", async () => {
    const token = await value(Date.now() + 60_000);
    const dot = token.indexOf(".");
    // Flip the first char of the signature portion (high-order bytes).
    const sig = token.slice(dot + 1);
    const first = sig[0];
    const flippedChar = first === "A" ? "B" : "A";
    const tampered = `${token.slice(0, dot + 1)}${flippedChar}${sig.slice(1)}`;
    expect(await readSessionValue(tampered)).toBe(null);
  });

  it("rejects a token with a valid signature but a missing payload", async () => {
    // signature computed over an empty string doesn't match a real payload
    const payload = encodeSessionPayload({ uid, exp: Date.now() + 60_000 });
    const sig = await signSessionToken(payload);
    // splice an invalid base64 char into the payload then reattach signature
    const bad = payload.slice(0, 2) + "!!" + payload.slice(2);
    expect(await readSessionValue(`${bad}.${sig}`)).toBe(null);
  });

  it("decodeSessionPayload rejects non-objects", () => {
    expect(decodeSessionPayload(Buffer.from("nope").toString("base64url"))).toBe(null);
  });
});
