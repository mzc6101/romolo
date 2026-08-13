import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHmac } from "node:crypto";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  handlePaymentUpdated: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/christmas-export-handler", () => ({
  handlePaymentUpdated: mocks.handlePaymentUpdated,
}));

import { POST, verifySquareSignature } from "./route";

const KEY = "test-signature-key";
const URL = "https://romolo.example/api/webhooks/square";

function sign(body: string): string {
  return createHmac("sha256", KEY).update(URL + body).digest("base64");
}

describe("verifySquareSignature", () => {
  const body = '{"type":"catalog.version.updated","event_id":"abc"}';

  it("accepts a correctly signed payload", () => {
    expect(verifySquareSignature(body, sign(body), KEY, URL)).toBe(true);
  });

  it("rejects a missing signature header", () => {
    expect(verifySquareSignature(body, null, KEY, URL)).toBe(false);
  });

  it("rejects a tampered body", () => {
    expect(verifySquareSignature(body + "x", sign(body), KEY, URL)).toBe(false);
  });

  it("rejects a wrong notification URL", () => {
    const sig = createHmac("sha256", KEY)
      .update("https://wrong.example" + body)
      .digest("base64");
    expect(verifySquareSignature(body, sig, KEY, URL)).toBe(false);
  });

  it("rejects a wrong signing key", () => {
    const sig = createHmac("sha256", "different-key").update(URL + body).digest("base64");
    expect(verifySquareSignature(body, sig, KEY, URL)).toBe(false);
  });
});

describe("POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = KEY;
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = URL;
  });

  function request(event: object) {
    const body = JSON.stringify(event);
    return new Request(URL, {
      method: "POST",
      body,
      headers: { "x-square-hmacsha256-signature": sign(body) },
    });
  }

  it("preserves immediate catalog webhook revalidation", async () => {
    const response = await POST(request({ type: "catalog.version.updated" }));
    expect(response.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("square-catalog", { expire: 0 });
    expect(mocks.handlePaymentUpdated).not.toHaveBeenCalled();
  });

  it("dispatches payment.updated with the payment id", async () => {
    const response = await POST(request({
      type: "payment.updated",
      data: { object: { payment: { id: "PAY-123" } } },
    }));
    expect(response.status).toBe(200);
    expect(mocks.handlePaymentUpdated).toHaveBeenCalledWith("PAY-123");
  });

  it("returns non-2xx when payment export has a transient failure", async () => {
    mocks.handlePaymentUpdated.mockRejectedValueOnce(new Error("temporary"));
    const response = await POST(request({
      type: "payment.updated",
      data: { object: { payment: { id: "PAY-123" } } },
    }));
    expect(response.status).toBe(503);
  });

  it("returns 200 immediately for irrelevant events", async () => {
    const response = await POST(request({ type: "customer.updated" }));
    expect(response.status).toBe(200);
    expect(mocks.handlePaymentUpdated).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
