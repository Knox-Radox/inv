"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { invitation } from "@/content/invitation";
import { WaxSeal } from "./art/WaxSeal";
import { InvitationCard } from "./InvitationCard";
import { EmbossedPaper } from "./material/EmbossedPaper";
import styles from "./Envelope.module.css";

/** Set once the opening has been seen on this device. */
export const SEEN_KEY = "advika-sooraj-envelope-seen";

/**
 * The envelope — revision 3.
 *
 * An embossed cotton envelope the size of the card, its flap sealed with sage
 * wax. Tap the seal: the wax breaks and falls, the flap lifts on its champagne
 * lining, the two halves of the envelope part like doors, and the card inside is
 * revealed — the same component as the real card beneath, at the same size, so
 * when the envelope finally fades nothing appears to move.
 *
 * Six seconds, continuously in motion: seal, flap, doors, the card's relief
 * pressing in, the jasmine stitching, the names settling, and a sweep of light
 * across the paper at the end. Nothing here is linear and nothing bounces.
 *
 * Still not a gate. The invitation is server-rendered and first in the
 * document; this overlay follows it, the skip link is a real anchor that works
 * through CSS with no script, body is never given overflow:hidden, and a
 * nine-second failsafe resolves the sequence if it never reports done.
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
      // Private mode. The guest sees the opening again next time — a far
      // better failure than being stuck.
    }
  }, []);

  const open = useCallback(() => {
    if (opening) return;
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

  if (gone) return null;

  return (
    <div
      className={`envelope-overlay ${styles.overlay} ${opening ? styles.opening : ""}`}
      role="presentation"
      onAnimationEnd={(e) => {
        if (e.animationName.includes("overlay-out")) finish();
      }}
    >
      {/* The stage is the card's own box: full-bleed on a phone, a centred
          620px object on a desk above 900px. The envelope fills it exactly, so
          the card it reveals is 1:1 with the page beneath. */}
      <div className={styles.stage}>
        <div className={styles.box}>
          {/* What the doors part to reveal. The real card, again. */}
          <div className={`${styles.reveal} ${opening ? "stitching composing" : ""}`}>
            <InvitationCard replica />
            {/* The dark of the inside of the envelope, lifting as the card
                comes out. A scrim rather than a brightness filter, so the
                card underneath is never re-rasterised mid-animation. */}
            <div className={styles.scrim} aria-hidden="true" />
          </div>

          {/* The envelope body, as two doors cut from one sheet. */}
          <div className={`${styles.door} ${styles.doorLeft}`} aria-hidden="true">
            <div className={styles.sheetLeft}>
              <EmbossedPaper sheet="envelope" />
            </div>
          </div>
          <div className={`${styles.door} ${styles.doorRight}`} aria-hidden="true">
            <div className={styles.sheetRight}>
              <EmbossedPaper sheet="envelope" />
            </div>
          </div>

          {/* The flap: the same sheet, cut to a V, on a 3D hinge with the
              champagne lining on its back. */}
          <div className={styles.flap} aria-hidden="true">
            <div className={styles.flapFront}>
              <EmbossedPaper sheet="envelope" />
            </div>
            <div className={styles.flapBack} />
          </div>

          {/* The fold: a hairline of light on the crease, a soft shadow under it. */}
          <svg className={styles.fold} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 38 L50 56 L100 38" className={styles.foldShadow} />
            <path d="M0 38 L50 56 L100 38" className={styles.foldLight} />
          </svg>

          {/* Addressed, in the couple's hand. Readable before anything moves. */}
          <div className={styles.address} aria-hidden={opening || undefined}>
            <p className={styles.names}>
              <span className={styles.name}>{couple.first}</span>
              <span className={styles.conjunction}>{couple.conjunction}</span>
              <span className={styles.name}>{couple.second}</span>
            </p>
            <p className={styles.meta}>
              <span className={styles.metaStrong}>{day.fullDateDisplay}</span>
              <span>{`${day.venue.name}, ${day.venue.locality}`}</span>
            </p>
          </div>

          <button type="button" className={styles.sealButton} onClick={open}>
            <WaxSeal size={132} cracked={opening} />
            <span className={styles.sealLabel}>{copy.controls.open}</span>
          </button>

          {/* Light moving over the paper: once every nine seconds at rest, and
              once across the card at the end of the opening. */}
          <div className={styles.gleam} aria-hidden="true" />
        </div>
      </div>

      <a href="#invitation" className={styles.skip} onClick={finish}>
        {copy.controls.skip}
      </a>
    </div>
  );
}
