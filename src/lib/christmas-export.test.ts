import { describe, expect, it, vi } from "vitest";
import type { Order, Payment } from "square";
import {
  buildChristmasRow,
  CHRISTMAS_HEADERS,
  cleanPickupNote,
  createChristmasAppendSerializer,
  formatOrderDetails,
  formatPacificPickup,
  GoogleChristmasSheet,
  orderHasKit,
  type ChristmasRow,
} from "./christmas-export";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "ORDER-123",
    locationId: "LOC",
    referenceId: "romolo-website",
    fulfillments: [
      {
        type: "PICKUP",
        pickupDetails: {
          pickupAt: "2026-12-24T18:00:00Z",
          recipient: { displayName: "Jane Doe", phoneNumber: "650-555-0100" },
          note: "PAY AT PICKUP | Ring bell",
        },
      },
    ],
    lineItems: [
      {
        name: "Cannoli Online - Ricotta",
        variationName: "Full Size",
        catalogObjectId: "VAR",
        quantity: "2",
        modifiers: [{ name: "Chocolate Shell", quantity: "1" }],
        note: "Cannoli Kit | Set: 6 Full Size",
      },
      { name: "Cannoli Kit", quantity: "1" },
    ],
    ...overrides,
  };
}

const cardPayment: Payment = {
  id: "PAY",
  status: "COMPLETED",
  sourceType: "CARD",
  orderId: "ORDER-123",
};

describe("Christmas row formatting", () => {
  it("uses Pacific time and applies the December 22-24 boundary", () => {
    expect(formatPacificPickup("2026-12-22T07:30:00Z")).toEqual({
      year: "2026",
      month: "12",
      day: "21",
      time: "11:30 PM",
    });
    expect(buildChristmasRow(order({
      fulfillments: [{ type: "PICKUP", pickupDetails: { pickupAt: "2026-12-22T07:30:00Z" } }],
    }), cardPayment)).toBeNull();
    expect(buildChristmasRow(order({
      fulfillments: [{ type: "PICKUP", pickupDetails: { pickupAt: "2026-12-22T08:00:00Z" } }],
    }), cardPayment)?.year).toBe("2026");
    expect(buildChristmasRow(order({
      fulfillments: [{ type: "PICKUP", pickupDetails: { pickupAt: "2026-12-25T07:59:00Z" } }],
    }), cardPayment)?.values[2]).toBe("12/24");
    expect(buildChristmasRow(order({
      fulfillments: [{ type: "PICKUP", pickupDetails: { pickupAt: "2026-12-25T08:00:00Z" } }],
    }), cardPayment)).toBeNull();
  });

  it("emits the exact nine columns and payment mapping", () => {
    expect(CHRISTMAS_HEADERS).toEqual([
      "Name", "Time", "Date", "Paid", "Kit", "Order Details", "Notes", "Phone", "Square ID",
    ]);
    expect(buildChristmasRow(order(), cardPayment)?.values).toEqual([
      "Jane Doe",
      "10:00 AM",
      "12/24",
      "Yes",
      "Yes",
      "2x Cannoli, Filling: Ricotta, Size: Full Size, Chocolate Shell, Cannoli Kit, Set: 6 Full Size",
      "Ring bell",
      "650-555-0100",
      "ORDER-123",
    ]);
    expect(buildChristmasRow(order(), {
      ...cardPayment,
      sourceType: "EXTERNAL",
      externalDetails: { type: "OTHER", source: "Pay at Pickup" },
    })?.values[3]).toBe("No");
    expect(buildChristmasRow(order(), { ...cardPayment, sourceType: "CASH" })).toBeNull();
  });

  it("detects kits, skips the ad-hoc kit fee, and keeps one line per purchased item", () => {
    expect(orderHasKit(order().lineItems)).toBe(true);
    expect(orderHasKit([{ name: "Cannoli Online - Ricotta", quantity: "1" }])).toBe(false);
    expect(formatOrderDetails([
      { name: "Cookies", variationName: "Large Box", quantity: "1" },
      { name: "Cannoli Online - Ice Cream", variationName: "Mini Size", quantity: "3", note: "Kit: at home" },
      { name: "Cannoli Kit", quantity: "1" },
    ])).toBe("1x Cookies, Large Box\n3x Cannoli, Filling: Ice Cream, Size: Mini Size, Kit: at home");
  });

  it("removes only the standalone internal pay-at-pickup marker", () => {
    expect(cleanPickupNote("PAY AT PICKUP\nLeave by door\nKeep this | exactly")).toBe(
      "Leave by door\nKeep this | exactly",
    );
    expect(cleanPickupNote("PAY AT PICKUP | Leave by door | thank you")).toBe("Leave by door | thank you");
    expect(cleanPickupNote("Before | PAY AT PICKUP | after\r\nNext line")).toBe(
      "Before | after\r\nNext line",
    );
    expect(cleanPickupNote("Customer wrote PAY AT PICKUP please\nKeep | my pipes")).toBe(
      "Customer wrote PAY AT PICKUP please\nKeep | my pipes",
    );
    expect(cleanPickupNote("First line\nPAY AT PICKUP")).toBe("First line");
  });
});

describe("serializeChristmasAppend", () => {
  it("does not start a concurrent operation until the previous one settles", async () => {
    const serialize = createChristmasAppendSerializer();
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const events: string[] = [];

    const first = serialize(async () => {
      events.push("first:start");
      await firstGate;
      events.push("first:end");
      return 1;
    });
    const second = serialize(async () => {
      events.push("second:start");
      return 2;
    });

    await vi.waitFor(() => expect(events).toEqual(["first:start"]));
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(events).toEqual(["first:start", "first:end", "second:start"]);
  });
});

describe("GoogleChristmasSheet", () => {
  it("does not append an existing Square ID", async () => {
    const responses = [
      { sheets: [{ properties: { sheetId: 7, title: "2026" } }] },
      {},
      {},
      { values: [["Square ID"], ["ORDER-123"]] },
    ];
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(responses.shift()), { status: 200 })),
    );
    const sheet = new GoogleChristmasSheet("spreadsheet", async () => "token", fetchMock);
    expect(await sheet.appendIfMissing("2026", ["", "", "", "", "", "", "", "", "ORDER-123"])).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("repairs a partially initialized existing year tab before dedupe and append", async () => {
    const responses = [
      { sheets: [{ properties: { sheetId: 7, title: "2026" } }] },
      {},
      {},
      { values: [["Square ID"]] },
      {},
    ];
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(responses.shift()), { status: 200 })),
    );
    const values: ChristmasRow = ["Jane", "10:00 AM", "12/24", "Yes", "No", "1x Cookies", "", "555", "ORDER"];
    const sheet = new GoogleChristmasSheet("spreadsheet", async () => "token", fetchMock);

    expect(await sheet.appendIfMissing("2026", values)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).values).toEqual([[...CHRISTMAS_HEADERS]]);
    const formatRequests = JSON.parse(fetchMock.mock.calls[2][1].body).requests;
    expect(formatRequests[0].updateSheetProperties.properties).toEqual({
      sheetId: 7,
      gridProperties: { frozenRowCount: 1 },
    });
    expect(formatRequests[1].repeatCell.range.sheetId).toBe(7);
    expect(fetchMock.mock.calls[3][0]).toContain("I%3AI");
    expect(fetchMock.mock.calls[4][0]).toContain("valueInputOption=RAW");
  });

  it("creates and formats a year tab, then appends RAW values", async () => {
    const responses = [
      { sheets: [] },
      { replies: [{ addSheet: { properties: { sheetId: 42, title: "2027" } } }] },
      {},
      {},
      { values: [["Square ID"]] },
      {},
    ];
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(responses.shift()), { status: 200 })),
    );
    const values: ChristmasRow = ["Jane", "10:00 AM", "12/24", "Yes", "No", "1x Cookies", "", "555", "ORDER"];
    const sheet = new GoogleChristmasSheet("spreadsheet", async () => "token", fetchMock);

    expect(await sheet.appendIfMissing("2027", values)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(6);
    const createBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(createBody.requests[0].addSheet.properties).toEqual({ title: "2027" });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).values).toEqual([[...CHRISTMAS_HEADERS]]);
    const formatRequests = JSON.parse(fetchMock.mock.calls[3][1].body).requests;
    expect(formatRequests[0].updateSheetProperties).toEqual({
      properties: { sheetId: 42, gridProperties: { frozenRowCount: 1 } },
      fields: "gridProperties.frozenRowCount",
    });
    expect(formatRequests[1].repeatCell.range).toMatchObject({
      sheetId: 42,
      startColumnIndex: 5,
      endColumnIndex: 7,
    });
    expect(fetchMock.mock.calls[5][0]).toContain("valueInputOption=RAW");
    expect(JSON.parse(fetchMock.mock.calls[5][1].body).values).toEqual([values]);
  });
});
