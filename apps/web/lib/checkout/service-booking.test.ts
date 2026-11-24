import { describe, expect, it } from "vitest";
import { findServiceBookingConflict, parseServiceBooking } from "./service-booking";

describe("parseServiceBooking", () => {
  it("accepts a future booking when service requires it", () => {
    const date = "2099-01-10";
    const result = parseServiceBooking(date, "10:30", true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.booking?.date).toBe(date);
      expect(result.booking?.time).toBe("10:30");
      expect(result.booking?.startAt).toContain("2099-01-10");
      expect(result.booking?.endAt).toBeTruthy();
    }
  });

  it("rejects missing booking for service products", () => {
    const result = parseServiceBooking("", "", true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("date and time");
  });

  it("allows empty booking for non-service products", () => {
    const result = parseServiceBooking("", "", false);
    expect(result).toEqual({ ok: true, booking: null });
  });

  it("applies duration and buffers", () => {
    const result = parseServiceBooking("2099-01-10", "10:00", true, {
      durationMinutes: 60,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.booking) {
      expect(new Date(result.booking.endAt).getTime() - new Date(result.booking.startAt).getTime()).toBe(60 * 60_000);
    }
  });
});

describe("findServiceBookingConflict", () => {
  it("detects overlap including buffers", () => {
    const booking = {
      date: "2099-01-10",
      time: "10:00",
      startAt: "2099-01-10T10:00:00.000Z",
      endAt: "2099-01-10T11:00:00.000Z",
    };
    const conflict = findServiceBookingConflict(
      booking,
      [{ startAt: "2099-01-10T11:05:00.000Z", endAt: "2099-01-10T12:00:00.000Z" }],
      { durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 15 },
    );
    expect(conflict).not.toBeNull();
  });

  it("ignores non-overlapping bookings", () => {
    const booking = {
      date: "2099-01-10",
      time: "10:00",
      startAt: "2099-01-10T10:00:00.000Z",
      endAt: "2099-01-10T11:00:00.000Z",
    };
    const conflict = findServiceBookingConflict(
      booking,
      [{ startAt: "2099-01-10T11:30:00.000Z", endAt: "2099-01-10T12:00:00.000Z" }],
      { durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 15 },
    );
    expect(conflict).toBeNull();
  });
});
