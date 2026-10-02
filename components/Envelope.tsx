"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { invitation } from "@/content/invitation";
import { SEEN_KEY } from "@/lib/seen";
import { InvitationCard } from "./InvitationCard";
import styles from "./Envelope.module.css";

/**
 * One edge of the flap: a line a pen made, and a hairline of gold just inside
 * it, the way the edge of a good envelope is gilded.
 *
 * Drawn level, in a long thin box, and laid along the edge by rotating the box
 * — the flap's slope is the same at every screen size (Envelope.module.css,
 * `--slope`), so the angle is a constant and the line's own wander is never
 * stretched. `preserveAspectRatio="none"` only lengthens it.
 */
function Edge({ wander }: { wander: 0 | 1 }) {
  const ink = wander
    ? "M0 6C140 7.2 300 4.8 460 6.2S800 7 1010 5.4S1400 6.8 1600 6"
    : "M0 6C120 4.6 260 7.4 420 5.8S760 4.8 980 6.6S1380 5.2 1600 6";
  const gilt = wander
    ? "M34 2.6C220 3.3 420 1.9 640 2.9S1100 2.1 1600 2.6"
    : "M34 2.6C220 1.9 420 3.4 640 2.4S1100 3.2 1600 2.6";
  return (
    <svg viewBox="0 0 1600 12" preserveAspectRatio="none" focusable="false">
      <path className={styles.ink} d={ink} />
      <path className={styles.gilt} d={gilt} />
    </svg>
  );
}

/**
 * The envelope — revision 9, and drawn.
 *
 * Revisions 4 to 8 made the cover a photograph, because synthesising paper and
 * wax in code had read as fake three times. The client then asked for the
 * envelope in the hand the rest of the page is drawn in, and that is a
 * different thing from the first three attempts: those imitated a material,
 * and this is a picture of an envelope. `tools/paint.py` paints its three
 * pieces — the jasmine printed on the paper, the wax, the liner — and the
 * lines are drawn here.
 *
 * What a guest sees: ivory paper printed tone on tone with jasmine, a flap
 * whose two edges meet under a sage seal struck with the couple's own logo,
 * and their names. They tap anywhere. The seal gives and goes up on the flap;
 * inside, for about two seconds, is the one saturated thing on the page — a
 * lac-maroon liner block-printed in gold. The card rises out of it, its mark
 * is drawn and its border is strung, the envelope's front falls away, and the
 * card that is left is the page.
 *
 * The geometry needs no measuring any more. The flap is a triangle with its
 * point at `--apex` and its edges at a fixed slope, written as one `polygon()`
 * in viewport units, so the same three points serve a phone and a desktop.
 * `coverGeometry.ts` — 758 generated lines locating two creases in two crops
 * of a photograph — is gone with the photograph.
 *
 * There is no label and no visible skip: the whole cover is the target, which
 * is what a sealed envelope is. The skip link is still in the document for a
 * keyboard.
 *
 * Still not a gate: the invitation is server-rendered and first in the
 * document, the skip link is a real anchor that works with no script, `body` is
 * never `overflow:hidden`, and a nine-second failsafe resolves the sequence.
 */
export function Envelope({ cardSheet }: { cardSheet?: string }) {
  const { couple, day, copy } = invitation;
  const [opening, setOpening] = useState(false);
  const [gone, setGone] = useState(false);
  const [printed, setPrinted] = useState(false);
  const failsafe = useRef<number | undefined>(undefined);
  const print = useRef<HTMLImageElement>(null);

  const finish = useCallback(() => {
    window.clearTimeout(failsafe.current);
    setGone(true);
    document.documentElement.classList.remove("envelope-armed");
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode. The guest sees the opening again next time, which is a
      // far better failure than being stuck.
    }
  }, []);

  const open = useCallback(() => {
    if (opening) return;
    // The card inside the envelope is laid out at the viewport, and the page's
    // own card is at the top of the document. The crossfade at the end assumes
    // those are the same place, which is only true at scroll 0 — so the
    // document goes to the top now, under an opaque cover, where no one can
    // see it move.
    window.scrollTo(0, 0);
    setOpening(true);
    failsafe.current = window.setTimeout(finish, 9000);
  }, [opening, finish]);

  /*
   * A hash means the guest was sent somewhere — `#invitation` from the skip
   * link, `#reply` or `#stay` from the bar or from a message. The pre-paint
   * script in app/layout.tsx does not arm the cover for any of them, and this
   * takes it down if one arrives while it is up.
   */
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.length > 1) finish();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [finish]);

  useEffect(() => () => window.clearTimeout(failsafe.current), []);

  /*
   * The paper's print fades up when it has arrived, rather than being waited
   * for. The cover is whole without it — ivory, the flap, the seal, the names
   * — and the jasmine coming up through the paper a moment later is the one
   * thing on this page that is *supposed* to look like a wash still spreading.
   *
   * An effect as well as `onLoad`: an image that finished loading before
   * hydration has already fired its event at nobody.
   */
  useEffect(() => {
    if (print.current?.complete) setPrinted(true);
  }, []);

  /*
   * Hold the document at the top for as long as the cover is up.
   *
   * The cover is fixed and full bleed, so scrolling behind it shows the guest
   * nothing — it only decides where the page will be standing when the
   * envelope goes, and it decided badly: a flick on the sealed envelope, and
   * the opening ended by dissolving into a page already scrolled past the
   * card.
   *
   * Deliberately not `overflow: hidden` — not on `body` and not on `html`
   * either. docs/design-plan.md § The lockout, guarantee 1: nothing may make
   * this page unscrollable in a way that outlives the script that set it.
   * A CSS lock survives a dead script; these listeners are the script, so if
   * it dies the page scrolls.
   *
   * `wheel` and `touchmove` are refused outright rather than corrected after
   * the fact, so there is no snap-back to see. The `scroll` pin behind them
   * catches what they cannot: a restored scroll position on reload,
   * find-in-page, and the keyboard — which is left alone, because taking the
   * arrow keys off a guest is a worse failure than a scrolled cover.
   *
   * Gated on `envelope-armed`, which is the one thing that actually decides
   * whether the cover is on screen — and not on `gone`. A guest arriving on a
   * deep link gets no cover while this component stays mounted, and a guard
   * keyed on `gone` held the top of a page with nothing over it.
   */
  useEffect(() => {
    if (gone || !document.documentElement.classList.contains("envelope-armed")) return;
    const pin = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const refuse = (e: Event) => e.preventDefault();
    pin();
    window.addEventListener("scroll", pin, { passive: true });
    window.addEventListener("wheel", refuse, { passive: false });
    window.addEventListener("touchmove", refuse, { passive: false });
    return () => {
      window.removeEventListener("scroll", pin);
      window.removeEventListener("wheel", refuse);
      window.removeEventListener("touchmove", refuse);
    };
  }, [gone]);

  if (gone) return null;

  const sheet = `${styles.print} ${printed ? styles.printed : ""}`;

  return (
    <div
      className={`envelope-overlay ${styles.overlay} ${opening ? styles.opening : ""}`}
      role="presentation"
      onAnimationEnd={(e) => {
        if (e.animationName.includes("overlay-out")) finish();
      }}
    >
      <div className={styles.frame}>
        {/* Inside: the liner, then the page's ground, then the card. A whole
            frame of it, covered at rest by the flap above and the front below.
            The card sits where the page's own card sits, so once the envelope
            is out of the way there is nothing left to move. */}
        <div className={styles.inside} aria-hidden="true">
          <div className={styles.liner} />
          <div className={styles.ground} />
          <div className={`${styles.reveal} ${opening ? "stitching" : ""}`}>
            <InvitationCard replica sheetSrc={cardSheet} />
          </div>
        </div>

        {/* The front of the envelope: its printed paper, cut along the two
            edges the flap closes onto, and those edges drawn. It is one element
            so that it can fall away as one — see `.front`. */}
        <div className={styles.front} aria-hidden="true">
          <div className={styles.frontPaper}>
            {/* eslint-disable-next-line @next/next/no-img-element -- it must
                cover the frame exactly as its twin inside the flap does, and an
                optimiser free to resize one of them would slide the two prints
                apart. */}
            <img
              ref={print}
              className={sheet}
              src="/cover/sprigs.webp"
              alt=""
              decoding="async"
              fetchPriority="low"
              onLoad={() => setPrinted(true)}
            />
            {/* The shadow the closed flap throws on the paper under its edges. */}
            <span className={`${styles.arm} ${styles.armL} ${styles.cast}`} />
            <span className={`${styles.arm} ${styles.armR} ${styles.cast}`} />
          </div>
          {/* The cut edges themselves, and the shadow each throws on what is
              inside. Outside the paper's clip, because that shadow falls past
              the edge of the paper — which is the point of it. */}
          <span className={`${styles.arm} ${styles.armL} ${styles.rim}`}>
            <Edge wander={0} />
          </span>
          <span className={`${styles.arm} ${styles.armR} ${styles.rim}`}>
            <Edge wander={1} />
          </span>
        </div>

        {/* The flap: the same printed paper, cut to the triangle, turning on the
            top of the frame. Its two edges and the wax go with it. */}
        <div className={styles.flap} aria-hidden="true">
          <div className={styles.flapPaper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={sheet} src="/cover/sprigs.webp" alt="" decoding="async" />
            <span className={styles.flapShade} />
          </div>
          <span className={`${styles.arm} ${styles.armL} ${styles.crease}`}>
            <Edge wander={0} />
          </span>
          <span className={`${styles.arm} ${styles.armR} ${styles.crease}`}>
            <Edge wander={1} />
          </span>
          {/* The wax. Outside the flap's clip and inside its turn: it sits
              across the point, half on the flap and half over the paper below,
              and it goes up whole. Not next/image — it is placed to the pixel
              against the point of the flap. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.seal}
            src="/cover/wax.webp"
            width={420}
            height={420}
            alt=""
            fetchPriority="high"
          />
        </div>

        <div className={styles.type}>
          <p className={styles.names}>
            {couple.first}
            <span className={styles.amp}>{couple.conjunction}</span>
            {couple.second}
          </p>
          <p className={styles.date}>{day.fullDateDisplay}</p>
        </div>
      </div>

      {/* The whole cover is the target. A button rather than a handler on the
          overlay, so it is reachable and announced without a pointer. */}
      <button type="button" className={styles.hit} onClick={open}>
        <span className={styles.srOnly}>{copy.controls.open}</span>
      </button>

      <a href="#invitation" className={styles.skip} onClick={finish}>
        {copy.controls.skip}
      </a>
    </div>
  );
}
