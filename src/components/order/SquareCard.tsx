"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Square?: any;
  }
}

export type SquareCardHandle = {
  tokenize: () => Promise<{ token: string } | { error: string }>;
};

export function SquareCard({
  onReady,
  onError,
}: {
  onReady?: (handle: SquareCardHandle) => void;
  onError?: (msg: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cardInstance: any = null;

    async function init() {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
      if (!appId || !locationId) {
        setStatus("error");
        setErrorMsg("Square is not configured.");
        onError?.("Square is not configured.");
        return;
      }

      // Wait for the SDK to load (script is in layout.tsx)
      const start = Date.now();
      while (!window.Square && Date.now() - start < 8000) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!window.Square) {
        setStatus("error");
        setErrorMsg("Card field couldn't load — please refresh.");
        onError?.("Square SDK failed to load");
        return;
      }
      if (cancelled) return;

      try {
        const payments = window.Square.payments(appId, locationId);
        cardInstance = await payments.card();
        await cardInstance.attach(containerRef.current);
        if (cancelled) {
          await cardInstance.destroy();
          return;
        }
        setStatus("ready");
        onReady?.({
          tokenize: async () => {
            const result = await cardInstance.tokenize();
            if (result.status === "OK") {
              return { token: result.token };
            }
            const errors = result.errors ?? [];
            return {
              error:
                errors[0]?.message ?? "Card could not be processed.",
            };
          },
        });
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(err?.message ?? "Card field error.");
        onError?.(err?.message ?? "Card field error.");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (cardInstance) {
        cardInstance.destroy?.().catch(() => {});
      }
    };
  }, [onReady, onError]);

  return (
    <div>
      <div
        ref={containerRef}
        className="p-3 border border-romolo-border rounded-sm bg-white min-h-[60px]"
      />
      {status === "loading" && (
        <div className="mt-2 text-xs text-romolo-warm-gray">Loading secure card field…</div>
      )}
      {status === "error" && (
        <div className="mt-2 text-xs text-romolo-red">{errorMsg}</div>
      )}
    </div>
  );
}
