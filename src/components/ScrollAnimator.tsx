"use client";

import { useEffect } from "react";

const ANIMATE_SELECTOR =
  ".animate-on-scroll, .animate-fade-in, .animate-scale-in, .animate-slide-left, .animate-slide-right, .animate-draw-line";

export default function ScrollAnimator() {
  useEffect(() => {
    const observed = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const observeEl = (el: Element) => {
      if (observed.has(el)) return;
      observed.add(el);
      observer.observe(el);
    };

    /** Register this subtree's animated nodes (including the root if it matches). */
    const scanSubtree = (root: Element) => {
      if (root.matches(ANIMATE_SELECTOR)) observeEl(root);
      root.querySelectorAll(ANIMATE_SELECTOR).forEach(observeEl);
    };

    document.querySelectorAll(ANIMATE_SELECTOR).forEach(observeEl);

    const mutationObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          scanSubtree(node as Element);
        });
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
