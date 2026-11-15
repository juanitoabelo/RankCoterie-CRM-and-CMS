export type GeoHeaders = {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function number(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function geoFromHeaders(headers: Headers): GeoHeaders {
  return {
    country: headers.get("x-vercel-ip-country"),
    region: headers.get("x-vercel-ip-country-region"),
    city: decode(headers.get("x-vercel-ip-city")),
    latitude: number(headers.get("x-vercel-ip-latitude")),
    longitude: number(headers.get("x-vercel-ip-longitude")),
    timezone: headers.get("x-vercel-ip-timezone"),
  };
}

export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? null;
}
