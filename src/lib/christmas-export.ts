import "server-only";
import { GoogleAuth } from "google-auth-library";
import type { Order, OrderLineItem, Payment } from "square";
export const CHRISTMAS_HEADERS = [
  "Name",
  "Time",
  "Date",
  "Paid",
  "Kit",
  "Order Details",
  "Notes",
  "Phone",
  "Square ID",
] as const;

const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SQUARE_ID_COLUMN_INDEX = 8;

export type ChristmasRow = [
  name: string,
  time: string,
  date: string,
  paid: string,
  kit: string,
  orderDetails: string,
  notes: string,
  phone: string,
  squareId: string,
];

export type PickupParts = {
  year: string;
  month: string;
  day: string;
  time: string;
};

export function formatPacificPickup(pickupAt: string): PickupParts | null {
  const date = new Date(pickupAt);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = value("hour");
  const minute = value("minute");
  const dayPeriod = value("dayPeriod");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    time: `${hour}:${minute} ${dayPeriod}`,
  };
}

export function christmasPaymentStatus(payment: Payment): "Yes" | "No" | null {
  if (payment.sourceType === "CARD") return "Yes";
  if (
    payment.sourceType === "EXTERNAL" &&
    payment.externalDetails?.source === "Pay at Pickup"
  ) {
    return "No";
  }
  return null;
}

function isCannoli(line: OrderLineItem): boolean {
  return (line.name ?? "").startsWith("Cannoli Online - ");
}

function isKitFee(line: OrderLineItem): boolean {
  return !line.catalogObjectId && line.name === "Cannoli Kit";
}

function noteParts(note: string | null | undefined): string[] {
  return (note ?? "")
    .split(/\s*(?:\||\r?\n)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function orderHasKit(lines: OrderLineItem[] | null | undefined): boolean {
  return (lines ?? []).some(
    (line) =>
      isCannoli(line) &&
      noteParts(line.note).some(
        (part) => part === "Cannoli Kit" || part.startsWith("Kit:"),
      ),
  );
}

export function formatOrderDetails(
  lines: OrderLineItem[] | null | undefined,
): string {
  return (lines ?? [])
    .filter((line) => !isKitFee(line))
    .map((line) => {
      const quantity = line.quantity || "1";
      const details = [`${quantity}x ${isCannoli(line) ? "Cannoli" : line.name || "Item"}`];

      if (isCannoli(line)) {
        details.push(`Filling: ${(line.name ?? "").slice("Cannoli Online - ".length)}`);
        if (line.variationName) details.push(`Size: ${line.variationName}`);
      } else if (line.variationName) {
        details.push(line.variationName);
      }

      for (const modifier of line.modifiers ?? []) {
        if (modifier.name) details.push(modifier.name);
      }
      details.push(...noteParts(line.note));
      return details.join(", ");
    })
    .join("\n");
}

const PAY_AT_PICKUP_MARKER = "PAY AT PICKUP";

function cleanPickupNoteLine(line: string): { value: string; removedWholeLine: boolean } {
  const segments = line.split("|");
  const markerIndexes = segments.flatMap((segment, index) =>
    segment.trim() === PAY_AT_PICKUP_MARKER ? [index] : [],
  );
  if (markerIndexes.length === 0) return { value: line, removedWholeLine: false };
  if (segments.length === 1) return { value: "", removedWholeLine: true };

  const markerIndexSet = new Set(markerIndexes);
  let value = segments
    .filter((_segment, index) => !markerIndexSet.has(index))
    .join("|");
  if (markerIndexSet.has(0)) value = value.trimStart();
  if (markerIndexSet.has(segments.length - 1)) value = value.trimEnd();
  return { value, removedWholeLine: false };
}

export function cleanPickupNote(note: string | null | undefined): string {
  if (!note) return "";

  const parts = note.split(/(\r\n|\n|\r)/);
  for (let index = parts.length - 1; index >= 0; index -= 2) {
    const cleaned = cleanPickupNoteLine(parts[index]);
    if (!cleaned.removedWholeLine) {
      parts[index] = cleaned.value;
      continue;
    }

    if (index + 1 < parts.length) {
      parts.splice(index, 2);
    } else if (index > 0) {
      parts.splice(index - 1, 2);
    } else {
      parts.splice(index, 1);
    }
  }
  return parts.join("");
}

export function buildChristmasRow(
  order: Order,
  payment: Payment,
): { year: string; values: ChristmasRow } | null {
  if (!order.id) return null;
  const pickup = order.fulfillments?.find(
    (fulfillment) => fulfillment.type === "PICKUP" && fulfillment.pickupDetails?.pickupAt,
  );
  const pickupAt = pickup?.pickupDetails?.pickupAt;
  if (!pickupAt) return null;

  const date = formatPacificPickup(pickupAt);
  if (!date || date.month !== "12" || !["22", "23", "24"].includes(date.day)) {
    return null;
  }
  const paid = christmasPaymentStatus(payment);
  if (!paid) return null;

  return {
    year: date.year,
    values: [
      pickup.pickupDetails?.recipient?.displayName ?? "",
      date.time,
      `${date.month}/${date.day}`,
      paid,
      orderHasKit(order.lineItems) ? "Yes" : "No",
      formatOrderDetails(order.lineItems),
      cleanPickupNote(pickup.pickupDetails?.note),
      pickup.pickupDetails?.recipient?.phoneNumber ?? "",
      order.id,
    ],
  };
}

type Fetch = typeof fetch;

type SheetProperties = {
  sheetId?: number;
  title?: string;
};

type SheetsApiResponse = {
  sheets?: Array<{ properties?: SheetProperties }>;
  values?: unknown[][];
  replies?: Array<{ addSheet?: { properties?: SheetProperties } }>;
};

export class GoogleChristmasSheet {
  constructor(
    private readonly spreadsheetId: string,
    private readonly accessToken: () => Promise<string>,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  async appendIfMissing(year: string, values: ChristmasRow): Promise<boolean> {
    await this.ensureYearSheet(year);
    const idColumn = await this.request(
      `/${encodeURIComponent(this.spreadsheetId)}/values/${encodeURIComponent(`'${year}'!I:I`)}`,
    );
    const rows = (idColumn.values ?? []) as unknown[][];
    if (rows.some((row) => String(row[0] ?? "") === values[SQUARE_ID_COLUMN_INDEX])) return false;

    await this.request(
      `/${encodeURIComponent(this.spreadsheetId)}/values/${encodeURIComponent(`'${year}'!A:I`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        body: JSON.stringify({ values: [values] }),
      },
    );
    return true;
  }

  private async ensureYearSheet(year: string): Promise<SheetProperties> {
    const metadata = await this.request(
      `/${encodeURIComponent(this.spreadsheetId)}?fields=sheets.properties`,
    );
    let properties = (metadata.sheets ?? []).find(
      (sheet: { properties?: SheetProperties }) => sheet.properties?.title === year,
    )?.properties;

    if (!properties) {
      const created = await this.request(`/${encodeURIComponent(this.spreadsheetId)}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: year } } }],
        }),
      });
      properties = created.replies?.[0]?.addSheet?.properties;
    }
    if (properties?.sheetId == null) {
      throw new Error("Google Sheets did not return the year sheet id.");
    }

    // Always repair initialization. A previous webhook may have created the
    // tab and then failed before its headers or formatting were written.
    await this.request(
      `/${encodeURIComponent(this.spreadsheetId)}/values/${encodeURIComponent(`'${year}'!A1:I1`)}?valueInputOption=RAW`,
      {
        method: "PUT",
        body: JSON.stringify({ values: [[...CHRISTMAS_HEADERS]] }),
      },
    );
    await this.request(`/${encodeURIComponent(this.spreadsheetId)}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: properties.sheetId,
                gridProperties: { frozenRowCount: 1 },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: properties.sheetId,
                startRowIndex: 1,
                startColumnIndex: 5,
                endColumnIndex: 7,
              },
              cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
              fields: "userEnteredFormat.wrapStrategy",
            },
          },
        ],
      }),
    });
    return properties;
  }

  private async request(path: string, init: RequestInit = {}): Promise<SheetsApiResponse> {
    const token = await this.accessToken();
    const response = await this.fetchImpl(`${SHEETS_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`Google Sheets request failed (${response.status}): ${await response.text()}`);
    }
    return response.json();
  }
}

export function createChristmasAppendSerializer(): <T>(operation: () => Promise<T>) => Promise<T> {
  let queue: Promise<void> = Promise.resolve();

  return function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

export const serializeChristmasAppend = createChristmasAppendSerializer();

export function googleChristmasSheetFromEnv(): GoogleChristmasSheet {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!spreadsheetId || !email || !privateKey) {
    throw new Error("Christmas Google Sheets export is not configured.");
  }

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: [SHEETS_SCOPE],
  });
  return new GoogleChristmasSheet(spreadsheetId, async () => {
    const token = await auth.getAccessToken();
    if (!token) throw new Error("Google authentication returned no access token.");
    return token;
  });
}
