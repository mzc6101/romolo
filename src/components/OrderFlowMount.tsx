"use client";

import OrderFlow from "./OrderFlow";
import { useOrder } from "./OrderProvider";

export default function OrderFlowMount() {
  const { flavors } = useOrder();
  return <OrderFlow flavors={flavors} />;
}
