import { describe, it, expect } from "vitest";
import { serializeBusinessHours, slotsForDate } from "./hours";

describe("serializeBusinessHours", () => {
  it("maps Square business_hours periods to byWeekday with weekday numbers", () => {
    const result = serializeBusinessHours(
      {
        periods: [
          { dayOfWeek: "SUN", startLocalTime: "12:00:00", endLocalTime: "16:00:00" },
          { dayOfWeek: "TUE", startLocalTime: "11:00:00", endLocalTime: "18:00:00" },
        ],
      },
      "America/Los_Angeles"
    );

    expect(result.timezone).toBe("America/Los_Angeles");
    expect(result.byWeekday[0]).toEqual([
      { openLocal: "12:00", closeLocal: "16:00" },
    ]);
    expect(result.byWeekday[2]).toEqual([
      { openLocal: "11:00", closeLocal: "18:00" },
    ]);
    expect(result.byWeekday[1]).toEqual([]); // Monday: closed
  });

  it("merges multiple periods on the same day", () => {
    const result = serializeBusinessHours(
      {
        periods: [
          { dayOfWeek: "FRI", startLocalTime: "11:00:00", endLocalTime: "14:00:00" },
          { dayOfWeek: "FRI", startLocalTime: "17:00:00", endLocalTime: "21:00:00" },
        ],
      },
      "America/Los_Angeles"
    );
    expect(result.byWeekday[5]).toHaveLength(2);
  });
});

describe("slotsForDate", () => {
  const periods = {
    byWeekday: {
      0: [],
      1: [],
      2: [{ openLocal: "11:00", closeLocal: "13:00" }],
      3: [],
      4: [],
      5: [],
      6: [],
    },
    timezone: "America/Los_Angeles",
  };

  it("generates 30-minute slots within open periods", () => {
    // Tuesday 2026-05-05
    const slots = slotsForDate("2026-05-05", periods);
    expect(slots).toEqual(["11:00", "11:30", "12:00", "12:30"]);
  });

  it("returns empty for closed days", () => {
    expect(slotsForDate("2026-05-04", periods)).toEqual([]); // Monday
  });
});
