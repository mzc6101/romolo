import "server-only";
import { squareClient, squareLocationId } from "./client";
import type { OpenPeriods } from "./types";

const DAY_TO_WEEKDAY: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

function trimSeconds(t: string): string {
  // "11:00:00" -> "11:00"
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function serializeBusinessHours(
  raw: { periods?: Array<{ dayOfWeek?: string | null; startLocalTime?: string | null; endLocalTime?: string | null }> } | undefined,
  timezone: string
): OpenPeriods {
  const byWeekday: Record<number, Array<{ openLocal: string; closeLocal: string }>> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };
  for (const p of raw?.periods ?? []) {
    if (!p.dayOfWeek || !p.startLocalTime || !p.endLocalTime) continue;
    const wd = DAY_TO_WEEKDAY[p.dayOfWeek];
    if (wd == null) continue;
    byWeekday[wd].push({
      openLocal: trimSeconds(p.startLocalTime),
      closeLocal: trimSeconds(p.endLocalTime),
    });
  }
  return { byWeekday, timezone };
}

export async function getOpenPeriods(): Promise<OpenPeriods> {
  const client = squareClient();
  const locationId = squareLocationId();
  const { location } = await client.locations.get({ locationId });
  return serializeBusinessHours(
    (location as any)?.businessHours,
    (location as any)?.timezone ?? "America/Los_Angeles"
  );
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function slotsForDate(dateIso: string, periods: OpenPeriods): string[] {
  // dateIso = "YYYY-MM-DD". Compute weekday in the location's timezone.
  // For simplicity (no Intl date math), parse date as YYYY-MM-DD treated as a
  // local calendar date — Square business_hours are local to the shop.
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.getUTCDay();
  const dayPeriods = periods.byWeekday[weekday] ?? [];
  const slots: string[] = [];
  for (const p of dayPeriods) {
    const start = timeToMinutes(p.openLocal);
    const end = timeToMinutes(p.closeLocal);
    for (let t = start; t + 30 <= end; t += 30) {
      slots.push(minutesToTime(t));
    }
  }
  return slots;
}
