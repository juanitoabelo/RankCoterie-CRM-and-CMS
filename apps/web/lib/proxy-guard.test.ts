import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import {
  SESSION_COOKIE,
  encodeSessionPayload,
  signSessionToken,
} from "./session-token";

async function signedCookie(uid: string, exp: number): Promise<string> {
  const payload = encodeSessionPayload({ uid, exp });
  const signature = await signSessionToken(payload);
  return `${payload}.${signature}`;
}

function makeRequest(pathname: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `${SESSION_COOKIE}=${cookie}`);
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

describe("proxy route protection", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = "proxy-guard-test-secret";
  });

  it("leaves public front-end pages accessible without a session", async () => {
    for (const pathname of ["/", "/blog", "/search", "/listing/example", "/g/category/", "/administrator"]) {
      const response = await proxy(makeRequest(pathname));
      expect(response.headers.get("location"), pathname).toBeNull();
    }
  });

  it("exposes the canonical pathname to public server components", async () => {
    for (const pathname of ["/", "/blog/", "/search/"]) {
      const response = await proxy(makeRequest(pathname));
      expect(response.headers.get("x-middleware-request-x-pathname"), pathname).toBe(pathname);
    }
  });

  it("redirects guest admin dashboard requests to login", async () => {
    for (const pathname of ["/admin", "/admin/", "/admin/listings", "/admin/my-listing"]) {
      const response = await proxy(makeRequest(pathname));
      expect(response.status, pathname).toBe(302);
      expect(response.headers.get("location"), pathname).toMatch(/\/admin\/login\/?$/);
    }
  });

  it("allows login pages without a session", async () => {
    for (const pathname of ["/admin/login", "/admin/login/"]) {
      const response = await proxy(makeRequest(pathname));
      expect(response.headers.get("location"), pathname).toBeNull();
    }
  });

  it("allows admin dashboard requests with a valid session", async () => {
    const cookie = await signedCookie("user-1", Date.now() + 60_000);
    const response = await proxy(makeRequest("/admin/listings", cookie));
    expect(response.headers.get("location")).toBeNull();
  });

  it("rejects expired and tampered sessions", async () => {
    const expired = await signedCookie("user-1", Date.now() - 1_000);
    const payload = encodeSessionPayload({ uid: "user-1", exp: Date.now() + 60_000 });
    for (const cookie of [expired, `${payload}.tampered`, "not-a-token"]) {
      const response = await proxy(makeRequest("/admin/listings", cookie));
      expect(response.headers.get("location")).toMatch(/\/admin\/login\/?$/);
    }
  });

  it("keeps legacy /g redirects intact", async () => {
    const response = await proxy(makeRequest("/g/index.php"));
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("http://localhost/g/");
  });
});
