"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { invitation } from "@/content/invitation";
import { InvitationCard } from "./InvitationCard";
import styles from "./Envelope.module.css";

/** Set once the opening has been seen on this device. */
export const SEEN_KEY = "advika-sooraj-envelope-seen";

/**
 * The envelope — revision 4.
 *
 * Revisions 1–3 synthesised the paper and the wax with SVG lighting filters,
 * and the client's verdict was that it looked fake. It did. The reference's
 * quality comes from photography, not from code, so the cover is now a
 * photograph of a real sealed envelope with Advika and Sooraj's monogram
 * pressed into the real wax (`tools/cover.py`).
 *
 * The photograph is cut down the middle of the seal into two doors. Tapping
 * the seal parts them — slowly at first, which reads as the wax giving way,
 * then wide — and the two halves of the seal go with the halves of the
 * envelope they are stuck to. Behind them is the card, which is the same
 * component as the page beneath, so when the cover fades nothing moves.
 *
 * Still not a gate: the invitation is server-rendered and first in the
 * document, the skip link is a real anchor that works with no script, `body`
 * is never `overflow:hidden`, every animation supplies only its *from* state,
 * and a nine-second failsafe resolves the sequence if it never reports done.
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
      <div className={styles.stage}>
        <div className={styles.box}>
          {/* What the doors part to reveal: the real card, again. */}
          <div className={`${styles.reveal} ${opening ? "stitching composing" : ""}`}>
            <InvitationCard replica sheetSrc={cardSheet} />
            <div className={styles.scrim} aria-hidden="true" />
          </div>

          {/* One photograph, cut down the middle of the seal. Each door holds a
              full-width copy pinned to its own edge, so the two together are
              seamless until they move. */}
          <div className={`${styles.door} ${styles.doorLeft}`} aria-hidden="true">
            <div className={styles.leaf}>
              <div className={styles.photo} />
            </div>
          </div>
          <div className={`${styles.door} ${styles.doorRight}`} aria-hidden="true">
            <div className={styles.leaf}>
              <div className={styles.photo} />
            </div>
          </div>

          {/* Light moving across the paper: once every nine seconds at rest. */}
          <div className={styles.gleam} aria-hidden="true" />

          {/* The addressed face, over a soft wash so it stays legible on the
              photograph. */}
          <div className={styles.address}>
            <p className={styles.names}>
              {couple.first}
              <span className={styles.amp}>{couple.conjunction}</span>
              {couple.second}
            </p>
            <p className={styles.meta}>
              <span className={styles.metaStrong}>{day.fullDateDisplay}</span>
              <span>{`${day.venue.name}, ${day.venue.locality}`}</span>
            </p>
          </div>

          <button type="button" className={styles.sealButton} onClick={open}>
            <span className={styles.sealLabel}>{copy.controls.open}</span>
          </button>
        </div>
      </div>

      <a href="#invitation" className={styles.skip} onClick={finish}>
        {copy.controls.skip}
      </a>
    </div>
  );
}
