"use client";

import { useEffect, useState } from "react";
import { invitation } from "@/content/invitation";
import styles from "./Countdown.module.css";

const TARGET = Date.parse(invitation.countdown.target);
const DAY_ENDS = Date.parse(invitation.countdown.dayEnds);

type State =
  | { kind: "before"; days: number; hours: number; minutes: number }
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
  };
}

/**
 * The countdown, and the two states it becomes — docs/design-plan.md
 * § The three time states.
 *
 * Nobody designed the reference sites for the invitation outliving the event;
 * one of them currently reads `00 DAYS 00 HOURS 00 MINUTES`. This link will be
 * opened in 2030 by someone who wants to look at it again, and that guest is
 * designed for here. It never renders a zero and never renders a negative.
 *
 * The governing principle: a kept invitation does not change its words. The
 * inviting line stays in the invitational tense forever. Exactly one live
 * element — the thing that was counting — resolves.
 *
 * Both boundaries are fixed UTC constants, so the state machine carries no
 * timezone risk and the value is identical for a guest in Chennai and one in
 * Dallas. Days, hours, minutes; no seconds, which for a fourteen-month
 * countdown are noise, a 1Hz repaint and a battery cost.
 *
 * Rendered on the server as the JS-off line, which is true in every era and is
 * the same two-line shape, so replacing it on mount shifts nothing.
 */
export function Countdown() {
  const c = invitation.copy.countdown;
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const tick = () => setState(stateAt(Date.now()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Server render, and every render before hydration. Adds the ceremony time,
  // which the card does not carry, so it is information rather than filler.
  if (state === null) {
    return (
      <Shape lead={c.staticLead} trail={c.staticTrail} />
    );
  }

  if (state.kind === "after") {
    return <Shape lead={c.afterLead} trail={c.afterTrail} />;
  }

  if (state.kind === "today") {
    return <Shape lead={c.todayLead} trail={invitation.day.fullDateDisplay} />;
  }

  return (
    <p className={styles.block}>
      <span className={styles.lead}>
        <span className={styles.figure}>{state.days}</span>
        <span className={styles.unit}>{c.units.days}</span>
        <span className={styles.wrap}>
          <span className={styles.figure}>{state.hours}</span>
          <span className={styles.unit}>{c.units.hours}</span>
          <span className={styles.figure}>{state.minutes}</span>
          <span className={styles.unit}>{c.units.minutes}</span>
        </span>
      </span>
      <span className={styles.trail}>{c.until}</span>
    </p>
  );
}

/** One shape for all four states, so switching between them shifts nothing. */
function Shape({ lead, trail }: { lead: string; trail: string }) {
  return (
    <p className={styles.block}>
      <span className={styles.lead}>
        <span className={styles.figure}>{lead}</span>
      </span>
      <span className={styles.trail}>{trail}</span>
    </p>
  );
}
