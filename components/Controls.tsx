"use client";

import { useState } from "react";
import { invitation } from "@/content/invitation";
import { googleCalendarUrl } from "@/lib/calendar";
import styles from "./Controls.module.css";

/**
 * The persistent controls — docs/design-plan.md § Layout.
 *
 * Discreet, one-handed, and never covering content: the page reserves the bar's
 * height at its foot, so nothing is ever underneath it. Paper rather than
 * chrome — ground colour, one gold hairline, text labels.
 *
 * Add-to-calendar is a plain anchor to a real .ics route, so it works with
 * JavaScript disabled. The Google link is offered beside it because a large
 * share of this audience lives in Google Calendar and .ics import there is a
 * two-step affair.
 *
 * The sound toggle renders only when a track is actually configured. It is
 * null in content/invitation.ts pending docs/open-questions.md #3, and a
 * control that does nothing is worse than no control.
 */
export function Controls() {
  const { copy, audio } = invitation;
  const [added, setAdded] = useState(false);

  return (
    <div className={styles.bar}>
      {audio ? <SoundToggle /> : <span />}

      <span className={styles.actions}>
        <a
          className={styles.action}
          href={googleCalendarUrl()}
          target="_blank"
          rel="noreferrer noopener"
        >
          Google
        </a>
        <a
          className={styles.action}
          href="/invitation.ics"
          download="advika-and-sooraj.ics"
          onClick={() => setAdded(true)}
        >
          {added ? copy.controls.calendarDone : copy.controls.calendar}
        </a>
      </span>
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(false);
  const { copy, audio } = invitation;
  if (!audio) return null;

  return (
    <button
      type="button"
      className={styles.action}
      aria-pressed={on}
      onClick={() => setOn((v) => !v)}
    >
      <SoundMark on={on} />
      <span>{copy.controls.sound}</span>
    </button>
  );
}

/** Drawn for this page: three arcs of a struck note, and the stroke through
 *  them when it is off. No icon pack is used anywhere in this project. */
function SoundMark({ on }: { on: boolean }) {
  return (
    <svg
      className={styles.mark}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 7.2h2.4L8.6 4.4v9.2L5.4 10.8H3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {on && (
        <>
          <path d="M11 6.4a3.6 3.6 0 0 1 0 5.2" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M13.1 4.6a6.4 6.4 0 0 1 0 8.8" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" opacity="0.7" />
        </>
      )}
      {!on && (
        <path d="M11.2 6.6l4.4 4.8" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      )}
    </svg>
  );
}
