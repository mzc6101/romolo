"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef } from "react";
import type { MenuItem } from "@/lib/data";

type MenuGalleryModalProps = {
  item: MenuItem | null;
  onClose: () => void;
};

export function MenuGalleryModal({ item, onClose }: MenuGalleryModalProps) {
  const open = item !== null;
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-romolo-charcoal/45 backdrop-blur-[2px] animate-[fade-in_0.25s_ease-out_both]"
        onClick={onClose}
        aria-hidden={true}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-4xl max-h-[min(90vh,880px)] overflow-y-auto rounded-sm border border-romolo-border bg-white shadow-[0_24px_80px_-20px_rgba(26,26,26,0.25)] animate-[scale-in_0.35s_var(--ease-out-expo)_both]"
      >
        <div className="sticky top-0 z-10 flex justify-end border-b border-romolo-border bg-white/95 px-4 py-3 backdrop-blur-sm md:px-8 md:py-4">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-sm text-romolo-warm-gray transition-colors hover:bg-romolo-cream hover:text-romolo-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-romolo-red/35 focus-visible:ring-offset-2"
            aria-label="Close gallery"
          >
            <span className="text-2xl font-light leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className="px-6 pb-10 pt-2 md:px-10 md:pb-12 md:pt-4">
          <div className="flex items-center gap-6 mb-6">
            <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60 shrink-0" />
            <p className="text-base md:text-lg tracking-[0.3em] uppercase text-romolo-red font-medium m-0">
              Gallery
            </p>
          </div>
          <h2
            id={titleId}
            className="font-[var(--font-serif)] text-4xl md:text-5xl font-light text-romolo-charcoal leading-[0.95] tracking-[-0.01em] m-0 pr-4"
          >
            {item.name}
          </h2>
          {item.description ? (
            <p className="mt-5 max-w-2xl text-[15px] md:text-[17px] text-romolo-warm-gray leading-relaxed m-0">
              {item.description}
            </p>
          ) : null}

          <div className="h-[1px] bg-romolo-border my-10 origin-left" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-7">
            {item.galleryUrls.map((src, i) => (
              <figure key={`${item.id}-${i}`} className="m-0 group">
                <div className="relative aspect-square rounded-sm overflow-hidden bg-romolo-cream border border-romolo-border">
                  <Image
                    src={src}
                    alt={`${item.name} — gallery photo ${i + 1} of ${item.galleryUrls.length}`}
                    fill
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                    sizes="(min-width: 1024px) 28vw, (min-width: 640px) 30vw, 90vw"
                  />
                </div>
              </figure>
            ))}
          </div>

          {item.options && item.options.length > 0 ? (
            <>
              <div className="h-[1px] bg-romolo-border my-10 origin-left" />
              <div className="flex items-center gap-6 mb-8">
                <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60 shrink-0" />
                <p className="text-base md:text-lg tracking-[0.3em] uppercase text-romolo-red font-medium m-0">
                  Ordering Options
                </p>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7 max-w-3xl">
                {item.options.map((group) => (
                  <div key={group.label}>
                    <dt className="font-[var(--font-serif)] text-[18px] md:text-[20px] font-medium text-romolo-charcoal leading-snug m-0">
                      {group.label}
                    </dt>
                    <dd className="mt-2 text-[14px] md:text-[15px] text-romolo-warm-gray leading-relaxed m-0">
                      {group.choices.join("  ·  ")}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
