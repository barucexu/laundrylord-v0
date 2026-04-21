import { describe, expect, it } from "vitest";
import { formatTimelineDate } from "@/lib/timeline-date";

describe("formatTimelineDate", () => {
  it("renders date-only timeline values as local dates instead of shifting through UTC", () => {
    expect(formatTimelineDate("2026-04-21")).toBe(new Date(2026, 3, 21).toLocaleDateString());
  });

  it("renders timestamp timeline values with the browser locale", () => {
    const timestamp = "2026-04-21T15:30:00.000Z";
    expect(formatTimelineDate(timestamp)).toBe(new Date(timestamp).toLocaleDateString());
  });
});
