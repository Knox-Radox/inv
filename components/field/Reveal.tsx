"use client";

import { useEffect, useRef } from "react";
import styles from "./Reveal.module.css";

const IN = styles.in ?? "in";

/**
 * A scroll reveal — revision 3.
 *
 * Each section of the field rises into view once as it enters the viewport.
 * The hidden initial state applies only when the pre-paint script has marked
 * that JavaScript is running (`html.js`), so with scripts off every section is
 * simply present. Under reduced motion there is no rise, only a short fade.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add(IN);
          io.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${className ?? ""}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
