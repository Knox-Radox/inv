"use client";

import { useEffect, useState } from "react";
import { invitation } from "@/content/invitation";
import styles from "./Countdown.module.css";

const TARGET = Date.parse(invitation.countdown.target);
const DAY_ENDS = Date.parse(invitation.countdown.dayEnds);

type State =
  | { kind: "before"; days: number; hours: number; minutes: number; seconds: number }
  | { kind: "today" }
  | { kind: "after" };

function stateAt(now: number): State {
  if (now >= DAY_ENDS) return { kind: "after" };
  if (now >= TARGET) return { kind: "today" };
  const ms = TARGET - now;
  return {
    kind: "before",
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

/**
 * The countdown — revision 3.
 *
 * Four columns with presence: large display numerals over their units, ruled
 * apart by fine gold hairlines, ticking every second. Each numeral is keyed by
 * its value so a change remounts it and it settles in with a short rise.
 *
 * Still computed against fixed UTC instants — identical for a guest in Chennai
 * and one in Dallas — and still three states: before, "Today", and, from
 * midnight on the 28th and forever after, "We were married on Friday, 27
 * November 2026." It never renders a zero row. The server renders the
 * ceremony time, true in every era.
 */
export function Countdown() {
  const c = invitation.copy.countdown;
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const tick = () => setState(stateAt(Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (state === null) return <Shape lead={c.staticLead} trail={c.staticTrail} />;
  if (state.kind === "after") return <Shape lead={c.afterLead} trail={c.afterTrail} />;
  if (state.kind === "today") return <Shape lead={c.todayLead} trail={invitation.day.fullDateDisplay} />;

  const cells: [number, string][] = [
    [state.days, c.units.days],
    [state.hours, c.units.hours],
    [state.minutes, c.units.minutes],
    [state.seconds, c.units.seconds],
  ];

  return (
    <div className={styles.block}>
      <div className={styles.row} role="timer" aria-live="off">
        {cells.map(([value, unit], i) => (
          <div key={unit} className={styles.cell}>
            {i > 0 && <span className={styles.rule} aria-hidden="true" />}
            <span className={styles.figure}>
              <span key={value} className={styles.digit}>
                {i === 0 ? value : String(value).padStart(2, "0")}
              </span>
            </span>
            <span className={styles.unit}>{unit}</span>
          </div>
        ))}
      </div>
      <p className={styles.trail}>{c.until}</p>
    </div>
  );
}

function Shape({ lead, trail }: { lead: string; trail: string }) {
  return (
    <div className={styles.block}>
      <p className={styles.lead}>{lead}</p>
      <p className={styles.trail}>{trail}</p>
    </div>
  );
}
