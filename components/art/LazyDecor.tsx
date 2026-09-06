"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import styles from "./LazyDecor.module.css";

/**
 * Loads an ornament layer after the page is interactive, and never on the
 * server — docs/revision-6-ornament.md § The weight of it.
 *
 * **This is the difference between LCP 11.8 s and LCP 1.2 s**, and it is worth
 * writing down why, because the obvious reading of the number is wrong.
 *
 * Every ornament is inline SVG. Server-rendered, the whole cast came to about
 * 500 KB of markup — and Next serialises the rendered tree a second time into
 * the RSC payload, so the built document was **1.33 MB raw, 238 KB gzipped**.
 * On the Slow 4G profile the harness measures against, 238 KB is about five
 * seconds of transfer, and the cover photograph — which is the LCP element and
 * the first thing a guest sees — queued behind all of it. None of that markup
 * is above the fold and none of it is content: every piece is `aria-hidden`
 * decoration.
 *
 * So it is not in the document at all. `ssr: false` keeps it out of both the
 * HTML and the RSC payload; the geometry arrives in its own async chunk once
 * hydration is done, and the `.stage` wrappers that hold the layout are still
 * server-rendered, so nothing moves when it lands.
 *
 * With JavaScript off there is no ornament and every fact is still on the
 * page, which is the right direction to fail in — the same one the envelope
 * fails in.
 */
const PIECES = {
  threshold: dynamic(() => import("./decor/ThresholdDeco"), { ssr: false }),
  hanging: dynamic(() => import("./decor/HangingDeco"), { ssr: false }),
  entrance: dynamic(() => import("./decor/EntranceDeco"), { ssr: false }),
  closing: dynamic(() => import("./decor/ClosingThresholdDeco"), { ssr: false }),
  kolam: dynamic(
    () => import("./decor/ClosingThresholdDeco").then((m) => m.KolamDeco),
    { ssr: false },
  ),
} as const;

/**
 * How near the viewport a stage has to be before its ornament is fetched.
 *
 * Generous, so the wash has bloomed by the time the guest arrives, and not so
 * generous that the first stage loads while the cover photograph is still in
 * flight. The countdown — the topmost ornament — begins roughly 1,200 px down
 * a phone, so at this margin nothing is requested until a guest has scrolled
 * past the card.
 */
const NEAR = "700px 0px";

export function LazyDecor({
  piece,
  flow = false,
}: {
  piece: keyof typeof PIECES;
  /**
   * `true` when the layer is part of the document's flow rather than an
   * overlay on a positioned stage.
   *
   * Only the kolam is. It is rendered as a direct child of `.field` — outside
   * the measure the running thread lives in — so an `inset: 0` sentinel takes
   * its size from `.field` instead of from a stage, and the kolam came out
   * drawn across the top of the countdown, over the thoranam. It also has to
   * take part in layout, because it carries the page's bottom padding.
   */
  flow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No observer means no ornament rather than all of it at once: the
    // fallback is the same one a guest with JavaScript off already gets.
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: NEAR },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Piece = PIECES[piece];
  /*
   * The sentinel is what gets observed, and it has to be in the layout — a
   * zero-height absolutely positioned element in a stage that is 600 px tall
   * intersects the moment the stage's top edge does, which on the closing
   * section is most of a viewport too late.
   */
  return (
    <div ref={ref} className={flow ? styles.inFlow : styles.sentinel} aria-hidden="true">
      {near && <Piece />}
    </div>
  );
}
