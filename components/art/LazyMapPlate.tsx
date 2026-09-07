"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import styles from "./LazyMapPlate.module.css";

/**
 * Fetches the map plate once the guest is near it, and never on the server.
 *
 * The same argument as LazyDecor, for the same reason: the plate is 20 KB of
 * inline SVG, Next serialises a rendered tree twice — once as HTML and once
 * into the RSC payload — and the plate is four screens below a cover photograph
 * that is already the page's LCP element. `ssr: false` keeps it out of both.
 *
 * It is a separate wrapper from LazyDecor rather than a seventh entry in it
 * because every piece in that file is `aria-hidden` decoration sitting on a
 * positioned stage. This one is content inside a link: it takes part in layout,
 * it keeps its own aspect ratio so the arrival costs no shift, and it must stay
 * visible to a screen reader.
 */
const MapPlate = dynamic(() => import("./MapPlate"), { ssr: false });

/** Far enough out that the plate has drawn itself by the time it is looked at. */
const NEAR = "700px 0px";

export function LazyMapPlate() {
  const ref = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No observer means the plate simply never arrives, which is the same
    // place a guest with JavaScript off already lands: the link and the
    // address are both above it and both are real.
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

  return (
    <span ref={ref} className={styles.plate}>
      {near && <MapPlate />}
    </span>
  );
}
