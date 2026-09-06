"use client";

import { useEffect, useRef } from "react";

/**
 * Starts an ornament painting itself when the guest reaches it, and stops its
 * ambient motion when they leave — docs/revision-6-ornament.md § How
 * line-plus-wash is built.
 *
 * Two classes, two jobs:
 *
 * * `stitching` is the class `components/art/Stitch.module.css` already keys
 *   its draw-on off. Adding it here means every new piece inherits the exact
 *   primitive the envelope uses, including the guarantee behind lockout test
 *   T2: the animation supplies only the *from* value, so cancelling every
 *   animation on the page leaves every line complete.
 * * `painted` starts the wash bloom, and is set once and kept.
 *
 * `astir` is different: it tracks visibility for the whole life of the page,
 * so the flames and the garlands are only animating while somebody can see
 * them. A wedding invitation sits open in a browser tab for a long time and
 * three perpetual CSS animations on a phone is a real battery cost for motion
 * nobody is looking at.
 */
export function Painting({
  children,
  className,
  threshold = 0.14,
}: {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const start = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("stitching", "painted");
          start.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );
    start.observe(el);

    // Ambient motion only while it is on screen. Deliberately a second
    // observer with no threshold rather than a rootMargin on the first: this
    // one has to keep firing, and the first one has to stop.
    const stir = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle("astir", e.isIntersecting);
    });
    stir.observe(el);

    return () => {
      start.disconnect();
      stir.disconnect();
    };
  }, [threshold]);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {children}
    </div>
  );
}
