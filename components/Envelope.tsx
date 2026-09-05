"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { invitation } from "@/content/invitation";
import { WaxSeal } from "./art/WaxSeal";
import styles from "./Envelope.module.css";

/** Set once the opening has been seen on this device. */
export const SEEN_KEY = "advika-sooraj-envelope-seen";

/**
 * The envelope — docs/design-plan.md § Envelope choreography.
 *
 * The single orchestrated moment on the page, and the only place the motion
 * budget is spent. Five point nine seconds, staged in CSS keyframes with
 * per-element delays; no animation library is involved anywhere on this page.
 *
 * It is emphatically **not a gate**. Both reference sites trap the guest behind
 * a cover that must succeed, and one of them cannot be escaped at all. Here:
 *
 *   - The invitation is server-rendered, complete, and first in the document.
 *     This overlay follows it, so the skip link is a real anchor and the CSS
 *     sibling selector removes the overlay with no JavaScript at all.
 *   - `body` is never given `overflow: hidden`, in any state.
 *   - Resting state is the finished state, so cancelling every animation on the
 *     page leaves the card readable.
 *   - A nine-second failsafe resolves the sequence if it never reports done.
 *
 * The envelope is *addressed*: the names and the date are readable before
 * anything moves. That is the point of a hand-addressed envelope, and it makes
 * the choreography a gift rather than a toll.
 */
export function Envelope() {
  const { couple, day, copy } = invitation;
  const [opening, setOpening] = useState(false);
  const [gone, setGone] = useState(false);
  const failsafe = useRef<number | undefined>(undefined);

  const finish = useCallback(() => {
    window.clearTimeout(failsafe.current);
    setGone(true);
    document.documentElement.classList.remove("envelope-armed");
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode, or storage disabled. The guest simply sees the opening
      // again next time, which is a far better failure than being stuck.
    }
  }, []);

  const open = useCallback(() => {
    if (opening) return;
    setOpening(true);
    // Belt and braces: if the sequence never reports done — a dropped frame
    // budget, a suspended tab, an animation that never fires — resolve anyway.
    failsafe.current = window.setTimeout(finish, 9000);
  }, [opening, finish]);

  // The skip link works through :target in CSS, which needs no listener. This
  // only tidies up after it, so the overlay does not return on a hash change.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#invitation") finish();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [finish]);

  useEffect(() => () => window.clearTimeout(failsafe.current), []);

  if (gone) return null;

  return (
    <div
      className={`envelope-overlay ${styles.overlay} ${opening ? styles.opening : ""}`}
      // Not a modal: it never traps focus and never blocks the page beneath,
      // which is readable and scrollable the whole time.
      role="presentation"
      onAnimationEnd={(e) => {
        if (e.animationName.includes("card-rise-out")) finish();
      }}
    >
      <div className={styles.envelope}>
        {/* The flap. Its underside is the champagne tissue lining, which is
            why there are two faces rather than one rotating rectangle. */}
        <div className={styles.flap} aria-hidden="true">
          <div className={styles.flapFront} />
          <div className={styles.flapBack} />
          <svg
            className={styles.flapEdge}
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M0 0.6 L50 18.4 L100 0.6"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
              opacity="0.65"
            />
          </svg>
        </div>

        <button type="button" className={styles.sealButton} onClick={open}>
          <WaxSeal size={96} cracked={opening} />
          <span className={styles.sealLabel}>{copy.controls.open}</span>
        </button>

        <div className={styles.face}>
          <p className={styles.names}>
            <span className={styles.name}>{couple.first}</span>
            <span className={styles.conjunction}>{couple.conjunction}</span>
            <span className={styles.name}>{couple.second}</span>
          </p>
          <p className={styles.meta}>
            <span className={styles.metaStrong}>{day.fullDateDisplay}</span>
            <span>
              {day.venue.name}, {day.venue.locality}
            </span>
          </p>
        </div>
      </div>

      {/* A real anchor. Works with JavaScript disabled, with JavaScript broken,
          and while the sequence is mid-flight. */}
      <a href="#invitation" className={styles.skip} onClick={finish}>
        {copy.controls.skip}
      </a>
    </div>
  );
}
