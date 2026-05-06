import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySquareSignature } from "./route";

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
