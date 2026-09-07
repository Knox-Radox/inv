"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { invitation } from "@/content/invitation";
import { InvitationCard } from "./InvitationCard";
import { coverGeometry } from "./coverGeometry";
import styles from "./Envelope.module.css";

/** Set once the opening has been seen on this device. */
export const SEEN_KEY = "advika-sooraj-envelope-seen";

const poly = (pts: readonly (readonly [number, number])[]) =>
  `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(",")})`;

/**
 * The envelope — revision 8.
 *
 * Revision 4 made the cover a photograph, which answered the client's "it looks
 * fake"; revision 5 made it a macro, full bleed at every size, cropped two ways
 * by `tools/cover.py` so a phone and a desktop each get a frame made for them.
 *
 * Revision 8 answered four more notes from the client, and three of them were
 * one object: the wax.
 *
 * The photograph now carries **no wax at all**. `tools/cover.py` reconstructs
 * the paper across it and presses a blind-embossed jasmine relief over the
 * whole sheet, and `tools/seal.py` emits the wax separately — sage, struck with
 * the couple's own wedding logo — as `/cover/seal.webp`, which rides inside the
 * flap. What used to sit under the seal was a patch of reconstructed paper
 * composited over the photograph, and that patch is the "unnatural semicircle"
 * in the client's note.
 *
 * The opening is still the envelope's own. `tools/cover.py` measures where the
 * flap's two creases run in the photograph and where they meet the wax, and
 * emits it as `coverGeometry`; the flap is that polygon, cut along the creases
 * that are already in the picture, turning on the hinge the real flap turns on.
 * Below the creases it is cut along the **wax's own silhouette** — not a circle
 * enclosing it, which is what left a crescent of bare paper hanging off the
 * flap — so the seal goes up whole and nothing goes up with it. Then the card
 * rises out of the dark and the mouth dissolves into the page.
 *
 * There is no label and no visible skip: the whole cover is the target, which
 * is what the reference does and what a sealed envelope does. The skip link is
 * still in the document for a keyboard, it is just not decoration until then.
 *
 * Still not a gate: the invitation is server-rendered and first in the
 * document, the skip link is a real anchor that works with no script, `body` is
 * never `overflow:hidden`, and a nine-second failsafe resolves the sequence.
 */
export function Envelope({ cardSheet }: { cardSheet?: string }) {
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
    // see it move. Without this the opening ended by dissolving a card at the
    // top of the screen into a page scrolled halfway down it.
    window.scrollTo(0, 0);
    setOpening(true);
    failsafe.current = window.setTimeout(finish, 9000);
  }, [opening, finish]);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#invitation") finish();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [finish]);

  useEffect(() => () => window.clearTimeout(failsafe.current), []);

  /*
   * Hold the document at the top for as long as the cover is up.
   *
   * The cover is fixed and full bleed, so scrolling behind it shows the guest
   * nothing — it only decides where the page will be standing when the
   * envelope goes, and it decided badly: a flick on the sealed envelope, and
   * the opening ended by dissolving into a page already scrolled past the
   * card. On a desktop the moving scrollbar beside a full-bleed photograph
   * gave it away before the tap.
   *
   * Deliberately not `overflow: hidden` — not on `body` and not on `html`
   * either. docs/design-plan.md § The lockout, guarantee 1: nothing may make
   * this page unscrollable in a way that outlives the script that set it.
   * A CSS lock survives a dead script; these listeners are the script, so if
   * it dies the page scrolls. That is the property that matters, and it is why
   * the guard is built from events rather than from a class.
   *
   * `wheel` and `touchmove` are refused outright rather than corrected after
   * the fact, so there is no snap-back to see. The `scroll` pin behind them
   * catches what they cannot: a restored scroll position on reload,
   * find-in-page, and the keyboard — which is left alone, because taking the
   * arrow keys off a guest is a worse failure than a scrolled cover.
   *
   * Gated on `envelope-armed`, which is the one thing that actually decides
   * whether the cover is on screen — and not on `gone`, which was the first
   * version of this and was wrong. A guest arriving on `/#invitation` gets the
   * overlay hidden by CSS (`#invitation:target ~ .overlay`) while this
   * component stays mounted, so the guard was holding the top of a page with
   * no cover over it: a deep link that could not be scrolled. Caught by
   * tools/verify/contrast.js, which loads exactly that URL and found seven
   * sections stuck at opacity 0 because it could not scroll them into view.
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

  const p = coverGeometry.portrait;
  const l = coverGeometry.landscape;

  // Both frames' geometry rides in as custom properties, and the stylesheet
  // picks between them at the aspect-ratio breakpoint. It cannot be done the
  // other way round: the numbers are generated from the photograph, and a
  // media query cannot reach into a generated module.
  const vars = {
    "--p-ar": p.aspect,
    "--p-hinge": `${p.hingeY}%`,
    "--p-seal-x": `${p.sealX}%`,
    "--p-seal-y": `${p.sealY}%`,
    "--p-seal-ry": `${p.sealRy}%`,
    "--p-sprite-r": `${p.spriteR}%`,
    "--p-flap": poly(p.flap),
    "--p-mouth": poly(p.mouth),
    "--p-opened": poly(p.opened),
    "--l-ar": l.aspect,
    "--l-hinge": `${l.hingeY}%`,
    "--l-seal-x": `${l.sealX}%`,
    "--l-seal-y": `${l.sealY}%`,
    "--l-seal-ry": `${l.sealRy}%`,
    "--l-sprite-r": `${l.spriteR}%`,
    "--l-flap": poly(l.flap),
    "--l-mouth": poly(l.mouth),
    "--l-opened": poly(l.opened),
  } as React.CSSProperties;

  return (
    <div
      className={`envelope-overlay ${styles.overlay} ${opening ? styles.opening : ""}`}
      style={vars}
      role="presentation"
      onAnimationEnd={(e) => {
        if (e.animationName.includes("overlay-out")) finish();
      }}
    >
      <div className={styles.frame}>
        {/* The envelope, whole. Everything below the creases is this. */}
        <picture>
          <source media="(min-aspect-ratio: 1/1)" srcSet="/cover/envelope-landscape.webp" />
          <img
            className={styles.photo}
            src="/cover/envelope-portrait.webp"
            alt=""
            /* The page's LCP element, and on a Slow 4G throttle it was racing
               the seal sprite for the same 400 kbps. Ordered explicitly rather
               than left to the scanner's guess: the paper is what the guest is
               waiting to see, and the wax can land a moment later onto it. */
            fetchPriority="high"
          />
        </picture>

        {/* Inside: the dark, then the card, then the mouth that shows them.
            The card sits where the page's own card sits, so when the mouth
            dissolves at the end there is nothing to move. */}
        <div className={styles.mouth} aria-hidden="true">
          <div className={`${styles.reveal} ${opening ? "stitching" : ""}`}>
            <InvitationCard replica sheetSrc={cardSheet} />
          </div>
          {/* Over the card, not behind it: the card has to come *out* of the
              dark, so the dark has to be on it while it is still inside. */}
          <div className={styles.throat} />
        </div>

        {/* The flap: the same photograph, cut along its own creases, turning on
            its own hinge. Its share of the wax goes with it. */}
        <div className={styles.flap} aria-hidden="true">
          <picture>
            <source media="(min-aspect-ratio: 1/1)" srcSet="/cover/envelope-landscape.webp" />
            <img className={styles.photo} src="/cover/envelope-portrait.webp" alt="" />
          </picture>
          {/* The wax, laid back on the paper it was lifted from. It is a
              sprite rather than part of the photograph so that the photograph
              can be wax-free: what used to sit under the seal was a patch of
              reconstructed paper composited over it, and that patch is the
              "unnatural semicircle" the client saw the moment the flap
              started working. There is no patch now — under the wax is the
              same continuous sheet as everywhere else.

              Inside the flap, so it travels with it and needs no animation of
              its own. Its alpha is zero past 1.20 R, inside the flap's own
              1.31 R cut, so nothing of it is clipped. */}
          {/* Not next/image: this has to land on exact coordinates generated
              from the photograph, and an optimiser free to resize or re-encode
              it would move it off them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.seal}
            src="/cover/seal.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="low"
          />
          <span className={styles.flapShade} />
        </div>

        {/* Light moving across the paper: once every nine seconds at rest. */}
        <div className={styles.gleam} aria-hidden="true" />

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
