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
 * The envelope — revision 5.
 *
 * Revision 4 made the cover a photograph, which answered the client's "it looks
 * fake". It still framed that photograph as an *object*: a whole envelope, laid
 * small on a backdrop, with the page's dead space around it. The reference is
 * not an object on a page. It is a macro — cotton paper to all four edges, the
 * flap's V running down to the wax, and nothing else in the frame. So the cover
 * is now full bleed at every size, and the photograph is cropped two ways
 * (`tools/cover.py`) so a phone and a desktop each get a frame made for them
 * rather than one crop stretched across both.
 *
 * The opening is the envelope's own. `tools/cover.py` measures where the flap's
 * two creases run in the photograph and where they meet the wax, and emits it
 * as `coverGeometry`; the flap is that polygon, cut along the creases that are
 * already in the picture, turning on the hinge the real flap turns on. The wax
 * shears along the line between the two creases — the flap keeps the segment
 * above it, the envelope keeps the crescent below — and then the card rises out
 * of the dark and the mouth dissolves into the page.
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
   */
  useEffect(() => {
    if (gone) return;
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
    "--p-patch-r": `${p.patchR}%`,
    "--p-flap": poly(p.flap),
    "--p-mouth": poly(p.mouth),
    "--p-opened": poly(p.opened),
    "--l-ar": l.aspect,
    "--l-hinge": `${l.hingeY}%`,
    "--l-seal-x": `${l.sealX}%`,
    "--l-seal-y": `${l.sealY}%`,
    "--l-seal-ry": `${l.sealRy}%`,
    "--l-patch-r": `${l.patchR}%`,
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
          <img className={styles.photo} src="/cover/envelope-portrait.webp" alt="" />
        </picture>

        {/* The front of the envelope where the wax is sitting, reconstructed
            without it. The seal lifts with the flap — whole — and the paper it
            was stuck to is the front of the envelope, not a hole into it. The
            flap covers this until it goes. */}
        {/* Not next/image: this is a 5 KB asset that has to land on exact
            coordinates generated from the photograph, and an optimiser that is
            free to resize or re-encode it would move it off them. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.sealPatch} src="/cover/seal-patch.webp" alt="" aria-hidden="true" />

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
