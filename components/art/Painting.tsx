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
  settleAfter = 5200,
}: {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  /**
   * How long the whole sequence takes, plus margin. After this the layer is
   * marked `settled` and every entrance animation is switched off in favour of
   * its finished state.
   *
   * This exists because of `content-visibility: auto` on the stages. A skipped
   * section does not run its animations, and when it is rendered again they
   * start over — so scrolling down the page and back up re-drew every garland
   * from nothing, every time. Once a thing has been drawn it stays drawn.
   */
  settleAfter?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const start = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const t = e.target as HTMLElement;
          t.classList.add("stitching", "painted");
          t.dataset.paintedAt = String(Math.round(performance.now()));
          start.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );
    start.observe(el);

    /*
     * Ambient motion only while it is on screen, and the settle check.
     *
     * Deliberately a second observer with no threshold rather than a
     * rootMargin on the first: this one has to keep firing, and the first one
     * has to stop.
     *
     * The settle check lives here rather than on a timer because this is the
     * observer that fires at the only moment it matters. A section skipped by
     * `content-visibility` does not advance its animations — that is what is
     * being skipped — so a guest who scrolls quickly past the countdown and
     * straight back finds the garland part-strung. Resuming from where it
     * stopped is better than restarting, but a thing already scrolled past
     * should be finished with, and a thing that has had long enough should be
     * too. Both are decided the moment it comes back into view, which is the
     * moment anyone can see it.
     */
    const stir = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const t = e.target as HTMLElement;
        t.classList.toggle("astir", e.isIntersecting);
        const at = Number(t.dataset.paintedAt);
        if (!t.dataset.paintedAt) continue;
        if (!e.isIntersecting || performance.now() - at >= settleAfter) {
          t.classList.add("settled");
        }
      }
    });
    stir.observe(el);

    return () => {
      start.disconnect();
      stir.disconnect();
    };
  }, [threshold, settleAfter]);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {children}
    </div>
  );
}
