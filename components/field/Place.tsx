"use client";

import { useEffect, useRef } from "react";
import { invitation } from "@/content/invitation";
import { MapPlate } from "../art/MapPlate";
import styles from "./Place.module.css";

/**
 * The place — docs/design-plan.md § Layout.
 *
 * The plate is decorative and nothing else: no link, no embed, no iframe, no
 * deep link, no tile provider, no click handler, no hover. The address beneath
 * it is the real information, and it is plain selectable text so a guest can
 * copy it into whatever they already use.
 *
 * This is the page's second and last scroll-linked moment. The observer fires
 * once, disconnects itself, and is the only scroll listener on the page.
 */
export function Place() {
  const { day, copy } = invitation;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Honour the setting here as well as in CSS, so the observer does not even
    // arm for a guest who has asked for less motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("map-drawing");
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={styles.section} aria-labelledby="the-place">
      <h2 id="the-place" className={styles.title}>
        {copy.sectionTitles.location}
      </h2>

      <div className={styles.plate}>
        <MapPlate />
      </div>

      <address className={styles.address}>
        {day.venue.street}
        <br />
        {day.venue.city}, {day.venue.stateCode} {day.venue.postalCode}
      </address>
    </section>
  );
}
