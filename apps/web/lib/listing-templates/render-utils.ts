/**
 * Shared helpers for rendering single-listing pages (default + custom templates).
 */

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function parseGalleryIds(value: unknown): string[] {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      /* legacy rows store a bare comma-separated list */
    }
  }
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Build a keyless Google Maps embed src from a shared Maps URL, falling back to lat/lng. */
export function googleMapsEmbedSrc(url: string | null | undefined, lat?: number | null, lng?: number | null): string | null {
  if (url) {
    // Place/coordinates URLs embed most reliably via their @lat,lng segment.
    const coords = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coords) return `https://www.google.com/maps?q=${coords[1]},${coords[2]}&output=embed`;
    try {
      const u = new URL(url);
      const ll = u.searchParams.get("ll") || u.searchParams.get("center");
      if (ll) return `https://www.google.com/maps?q=${encodeURIComponent(ll)}&output=embed`;
      const query = u.searchParams.get("query");
      if (query) return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    } catch {
      /* not a valid URL — fall through and use it as a search query */
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
  }
  if (lat && lng) return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
  return null;
}

/** Normalize YouTube/Vimeo page URLs to embeddable player URLs; null when unsupported. */
export function videoEmbedSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/^\/(shorts|live)\/([\w-]+)/);
      if (m) return `https://www.youtube.com/embed/${m[2]}`;
      return null;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("vimeo.com")) {
      const m = u.pathname.match(/(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export const HOURS_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const HOURS_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function formatClock(time?: string): string {
  if (!time) return time ?? "";
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

export function getTierBadge(tier: string) {
  const badges: Record<string, { label: string; class: string }> = {
    FREE: { label: "Free", class: "bg-zinc-100 text-zinc-600" },
    STANDARD: { label: "Standard", class: "bg-blue-100 text-blue-700" },
    PREMIUM: { label: "Premium", class: "bg-purple-100 text-purple-700" },
    FEATURED: { label: "Featured", class: "bg-amber-100 text-amber-700" },
    SUPPRESSED: { label: "Suppressed", class: "bg-red-100 text-red-700" },
  };
  return badges[tier] || { label: tier, class: "bg-zinc-100 text-zinc-600" };
}

export function getStatusBadge(status: string) {
  const badges: Record<string, { label: string; class: string }> = {
    LIVE: { label: "Live", class: "bg-emerald-100 text-emerald-700" },
    PENDING_REVIEW: { label: "Pending Review", class: "bg-amber-100 text-amber-700" },
    DRAFT: { label: "Draft", class: "bg-zinc-100 text-zinc-600" },
    SUSPENDED: { label: "Suspended", class: "bg-orange-100 text-orange-700" },
    EXPIRED: { label: "Expired", class: "bg-red-100 text-red-700" },
  };
  return badges[status] || { label: status, class: "bg-zinc-100 text-zinc-600" };
}
