"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { INITIAL_FLAVORS, type Flavor } from "@/lib/data";

type OrderContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  flavors: Flavor[];
  setFlavors: (flavors: Flavor[]) => void;
  toggleFlavor: (id: string) => { name: string; now: boolean };
};

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [flavors, setFlavors] = useState<Flavor[]>(INITIAL_FLAVORS);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const toggleFlavor = useCallback((id: string) => {
    let toastInfo = { name: "", now: false };
    setFlavors((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, available: !f.available } : f));
      const updated = next.find((f) => f.id === id);
      if (updated) toastInfo = { name: updated.name, now: updated.available };
      return next;
    });
    return toastInfo;
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const value = useMemo(
    () => ({ isOpen, open, close, flavors, setFlavors, toggleFlavor }),
    [isOpen, open, close, flavors, toggleFlavor]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}
