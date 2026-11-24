export type ServiceBooking = {
  date: string;
  time: string;
  startAt: string;
  endAt: string;
};

export type ServiceBookingConstraints = {
  durationMinutes?: number | null;
  bufferBeforeMinutes?: number | null;
  bufferAfterMinutes?: number | null;
  maxBookings?: number | null;
  now?: Date;
};

export type ServiceBookingResult =
  | { ok: true; booking: ServiceBooking | null }
  | { ok: false; error: string };

export function parseServiceBooking(
  date: unknown,
  time: unknown,
  required: boolean,
  constraints: ServiceBookingConstraints = {},
): ServiceBookingResult {
  const rawDate = typeof date === "string" ? date.trim() : "";
  const rawTime = typeof time === "string" ? time.trim() : "";
  if (!rawDate && !rawTime) {
    return required
      ? { ok: false, error: "Please choose a date and time for this service." }
      : { ok: true, booking: null };
  }
  if (!rawDate || !rawTime) {
    return { ok: false, error: "Please choose both a date and time for this service." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return { ok: false, error: "Please choose a valid service date." };
  }
  const parsedDate = new Date(`${rawDate}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== rawDate) {
    return { ok: false, error: "Please choose a valid service date." };
  }
  const today = (constraints.now ?? new Date()).toISOString().slice(0, 10);
  if (rawDate < today) {
    return { ok: false, error: "Service bookings must be for today or later." };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(rawTime)) {
    return { ok: false, error: "Please choose a valid service time." };
  }
  const duration = Math.max(1, Math.floor(constraints.durationMinutes ?? 60));
  const startAt = new Date(`${rawDate}T${rawTime}:00.000Z`);
  if (Number.isNaN(startAt.getTime())) {
    return { ok: false, error: "Please choose a valid service time." };
  }
  const endAt = new Date(startAt.getTime() + duration * 60_000);
  return {
    ok: true,
    booking: {
      date: rawDate,
      time: rawTime,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    },
  };
}

export type ExistingServiceBooking = {
  startAt: string | Date;
  endAt?: string | Date | null;
  durationMinutes?: number | null;
  bufferBeforeMinutes?: number | null;
  bufferAfterMinutes?: number | null;
};

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function findServiceBookingConflict(
  booking: ServiceBooking,
  existing: ExistingServiceBooking[],
  constraints: ServiceBookingConstraints = {},
): ExistingServiceBooking | null {
  const duration = Math.max(1, Math.floor(constraints.durationMinutes ?? 60));
  const bufferBefore = Math.max(0, Math.floor(constraints.bufferBeforeMinutes ?? 0));
  const bufferAfter = Math.max(0, Math.floor(constraints.bufferAfterMinutes ?? 0));
  const start = toDate(booking.startAt);
  if (!start) return null;
  const end = toDate(booking.endAt) ?? new Date(start.getTime() + duration * 60_000);
  const blockedStart = start.getTime() - bufferBefore * 60_000;
  const blockedEnd = end.getTime() + bufferAfter * 60_000;

  for (const row of existing) {
    const rowStart = toDate(row.startAt);
    if (!rowStart) continue;
    const rowDuration = Math.max(1, Math.floor(row.durationMinutes ?? duration));
    const rowEnd = toDate(row.endAt ?? "") ?? new Date(rowStart.getTime() + rowDuration * 60_000);
    const rowBufferBefore = Math.max(0, Math.floor(row.bufferBeforeMinutes ?? bufferBefore));
    const rowBufferAfter = Math.max(0, Math.floor(row.bufferAfterMinutes ?? bufferAfter));
    const rowBlockedStart = rowStart.getTime() - rowBufferBefore * 60_000;
    const rowBlockedEnd = rowEnd.getTime() + rowBufferAfter * 60_000;
    if (blockedStart < rowBlockedEnd && rowBlockedStart < blockedEnd) return row;
  }
  return null;
}
