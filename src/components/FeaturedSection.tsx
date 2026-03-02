"use client";

import type { MenuItem } from "@/lib/menu-data";
import { ProductCard } from "./ProductCard";

export function FeaturedSection({ items }: { items: MenuItem[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <ProductCard key={item.id} item={item} />
      ))}
    </div>
  );
}
