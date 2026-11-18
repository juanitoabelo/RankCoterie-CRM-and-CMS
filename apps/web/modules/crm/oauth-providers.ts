export const OAUTH_PROVIDERS = ["google", "microsoft"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
};

export type OAuthActivity = {
  externalId: string;
  type: "EMAIL" | "MEETING";
  subject: string;
  body: string;
  occurredAt: Date;
  addresses: string[];
  webLink?: string | null;
};

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

const MICROSOFT_SCOPES = [
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Calendars.Read",
].join(" ");

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export function oauthProviderLabel(provider: OAuthProvider): string {
  return provider === "google" ? "Google Workspace" : "Microsoft 365";
}

export function oauthMissingEnv(provider: OAuthProvider): string[] {
  const names =
    provider === "google"
      ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
      : ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"];
  return names.filter((name) => !process.env[name]);
}

export function oauthProviderConfigured(provider: OAuthProvider): boolean {
  return oauthMissingEnv(provider).length === 0;
}

function client(provider: OAuthProvider): { id: string; secret: string } {
  const id =
    provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.MICROSOFT_CLIENT_ID;
  const secret =
    provider === "google"
      ? process.env.GOOGLE_CLIENT_SECRET
      : process.env.MICROSOFT_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(`${oauthProviderLabel(provider)} OAuth is not configured.`);
  }
  return { id, secret };
}

function microsoftTenant(): string {
  return process.env.MICROSOFT_TENANT_ID?.trim() || "common";
}

export function oauthRedirectUri(provider: OAuthProvider, requestUrl: string): string {
  const base = process.env.CRM_OAUTH_REDIRECT_BASE_URL?.trim() || new URL(requestUrl).origin;
  return new URL(`/api/crm/oauth/${provider}/callback`, base).toString();
}

export function oauthAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string,
): string {
  const { id } = client(provider);
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", id);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);
    return url.toString();
  }
  const url = new URL(
    `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize`,
  );
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

async function tokenRequest(
  url: string,
  body: Record<string, string>,
): Promise<OAuthTokenSet> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description || payload.error || `OAuth token request failed (${response.status}).`,
    );
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + Math.max(60, payload.expires_in - 60) * 1000)
      : undefined,
    scope: payload.scope,
  };
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
): Promise<OAuthTokenSet> {
  const { id, secret } = client(provider);
  if (provider === "google") {
    return tokenRequest("https://oauth2.googleapis.com/token", {
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
  }
  return tokenRequest(
    `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`,
    {
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: MICROSOFT_SCOPES,
    },
  );
}

export async function refreshOAuthToken(
  provider: OAuthProvider,
  refreshToken: string,
): Promise<OAuthTokenSet> {
  const { id, secret } = client(provider);
  if (provider === "google") {
    return tokenRequest("https://oauth2.googleapis.com/token", {
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    });
  }
  return tokenRequest(
    `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`,
    {
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
      scope: MICROSOFT_SCOPES,
    },
  );
}

async function oauthGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Provider request failed (${response.status}): ${body.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export async function fetchOAuthProfile(
  provider: OAuthProvider,
  accessToken: string,
): Promise<{ email: string }> {
  if (provider === "google") {
    const profile = await oauthGet<{ email?: string }>(
      "https://openidconnect.googleapis.com/v1/userinfo",
      accessToken,
    );
    if (!profile.email) throw new Error("Google account did not expose an email address.");
    return { email: profile.email };
  }
  const profile = await oauthGet<{ mail?: string; userPrincipalName?: string }>(
    "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",
    accessToken,
  );
  const email = profile.mail || profile.userPrincipalName;
  if (!email) throw new Error("Microsoft account did not expose an email address.");
  return { email };
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  const found = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const match of value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) {
      found.add(match.toLowerCase());
    }
  }
  return [...found];
}

function headerValue(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string,
): string {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function googleActivities(
  accessToken: string,
  cursor: Date | null,
): Promise<OAuthActivity[]> {
  const startedAt = Date.now();
  const since = cursor ?? new Date(startedAt - 7 * 86_400_000);
  const list = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  list.searchParams.set("maxResults", "25");
  list.searchParams.set("q", `after:${Math.floor(since.getTime() / 1000)}`);
  const messages = await oauthGet<{ messages?: Array<{ id: string }> }>(
    list.toString(),
    accessToken,
  );

  const emailActivities = await Promise.all(
    (messages.messages ?? []).map(async (message): Promise<OAuthActivity> => {
      const url = new URL(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}`,
      );
      url.searchParams.set("format", "metadata");
      for (const name of ["Subject", "From", "To", "Cc", "Date"]) {
        url.searchParams.append("metadataHeaders", name);
      }
      const detail = await oauthGet<{
        id: string;
        snippet?: string;
        internalDate?: string;
        payload?: { headers?: Array<{ name?: string; value?: string }> };
      }>(url.toString(), accessToken);
      const headers = detail.payload?.headers;
      const occurredAt = detail.internalDate
        ? new Date(Number(detail.internalDate))
        : parseDate(headerValue(headers, "Date"), new Date());
      return {
        externalId: `google:mail:${detail.id}`,
        type: "EMAIL",
        subject: headerValue(headers, "Subject") || "(no subject)",
        body: detail.snippet ?? "",
        occurredAt,
        addresses: uniqueEmails([
          headerValue(headers, "From"),
          headerValue(headers, "To"),
          headerValue(headers, "Cc"),
        ]),
        webLink: `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(detail.id)}`,
      };
    }),
  );

  const calendar = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  calendar.searchParams.set("timeMin", since.toISOString());
  calendar.searchParams.set("timeMax", new Date(startedAt + 7 * 86_400_000).toISOString());
  calendar.searchParams.set("singleEvents", "true");
  calendar.searchParams.set("orderBy", "startTime");
  calendar.searchParams.set("maxResults", "25");
  const events = await oauthGet<{
    items?: Array<{
      id: string;
      summary?: string;
      description?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      attendees?: Array<{ email?: string }>;
    }>;
  }>(calendar.toString(), accessToken);

  const meetingActivities = (events.items ?? []).map((event): OAuthActivity => {
    const start = event.start?.dateTime ?? event.start?.date;
    return {
      externalId: `google:event:${event.id}`,
      type: "MEETING",
      subject: event.summary || "(no title)",
      body: event.description ?? "",
      occurredAt: parseDate(start, new Date()),
      addresses: uniqueEmails((event.attendees ?? []).map((attendee) => attendee.email)),
      webLink: event.htmlLink ?? null,
    };
  });

  return [...emailActivities, ...meetingActivities];
}

async function microsoftActivities(
  accessToken: string,
  cursor: Date | null,
): Promise<OAuthActivity[]> {
  const startedAt = Date.now();
  const since = cursor ?? new Date(startedAt - 7 * 86_400_000);
  const messages = new URL("https://graph.microsoft.com/v1.0/me/messages");
  messages.searchParams.set("$top", "25");
  messages.searchParams.set("$orderby", "receivedDateTime desc");
  messages.searchParams.set("$filter", `receivedDateTime ge ${since.toISOString()}`);
  messages.searchParams.set(
    "$select",
    "id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,webLink",
  );
  const mail = await oauthGet<{
    value?: Array<{
      id: string;
      subject?: string;
      bodyPreview?: string;
      receivedDateTime?: string;
      webLink?: string;
      from?: { emailAddress?: { address?: string } };
      toRecipients?: Array<{ emailAddress?: { address?: string } }>;
      ccRecipients?: Array<{ emailAddress?: { address?: string } }>;
    }>;
  }>(messages.toString(), accessToken);

  const emailActivities = (mail.value ?? []).map((message): OAuthActivity => ({
    externalId: `microsoft:mail:${message.id}`,
    type: "EMAIL",
    subject: message.subject || "(no subject)",
    body: message.bodyPreview ?? "",
    occurredAt: parseDate(message.receivedDateTime, new Date()),
    addresses: uniqueEmails([
      message.from?.emailAddress?.address,
      ...(message.toRecipients ?? []).map((recipient) => recipient.emailAddress?.address),
      ...(message.ccRecipients ?? []).map((recipient) => recipient.emailAddress?.address),
    ]),
    webLink: message.webLink ?? null,
  }));

  const calendar = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  calendar.searchParams.set("startDateTime", since.toISOString());
  calendar.searchParams.set("endDateTime", new Date(startedAt + 7 * 86_400_000).toISOString());
  calendar.searchParams.set("$top", "25");
  calendar.searchParams.set("$orderby", "start/dateTime");
  calendar.searchParams.set(
    "$select",
    "id,subject,bodyPreview,start,end,attendees,webLink",
  );
  const events = await oauthGet<{
    value?: Array<{
      id: string;
      subject?: string;
      bodyPreview?: string;
      webLink?: string;
      start?: { dateTime?: string; timeZone?: string };
      attendees?: Array<{ emailAddress?: { address?: string } }>;
    }>;
  }>(calendar.toString(), accessToken);

  const meetingActivities = (events.value ?? []).map((event): OAuthActivity => ({
    externalId: `microsoft:event:${event.id}`,
    type: "MEETING",
    subject: event.subject || "(no title)",
    body: event.bodyPreview ?? "",
    occurredAt: parseDate(event.start?.dateTime, new Date()),
    addresses: uniqueEmails(
      (event.attendees ?? []).map((attendee) => attendee.emailAddress?.address),
    ),
    webLink: event.webLink ?? null,
  }));

  return [...emailActivities, ...meetingActivities];
}

export async function fetchOAuthActivities(
  provider: OAuthProvider,
  accessToken: string,
  cursor: Date | null,
): Promise<OAuthActivity[]> {
  return provider === "google"
    ? googleActivities(accessToken, cursor)
    : microsoftActivities(accessToken, cursor);
}
