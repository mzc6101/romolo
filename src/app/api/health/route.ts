import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/square/catalog";
import { getOpenPeriods } from "@/lib/square/hours";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [{ items }, hours] = await Promise.all([
      getCatalog(),
      getOpenPeriods(),
    ]);
    return NextResponse.json({
      ok: true,
      catalogItems: items.length,
      itemNames: items.map((i) => i.name),
      openDays: Object.entries(hours.byWeekday)
        .filter(([, periods]) => periods.length > 0)
        .map(([wd]) => Number(wd)),
      timezone: hours.timezone,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
