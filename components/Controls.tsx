"use client";

import { useEffect, useRef, useState } from "react";
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
 * Revision 9 gave it more to do. The client asked for "places to stay" beside
 * the calendar, so the bar is now the way round a page that has grown from four
 * sections to six: it takes a guest to the hotels, and to the reply card.
 *
 * That left no room for the two calendar links that used to sit side by side
 * ("Google" and "Add to calendar"), and "Google" on its own was never a good
 * name for a link. They are one disclosure now: "Add to calendar" opens upward
 * onto the two calendars a guest might use, each named. It is a `<details>`, so
 * it opens with JavaScript off, and the .ics inside it is still a plain anchor
 * to a real route.
 *
 * The sound toggle renders only when a track is actually configured. It is
 * null in content/invitation.ts pending docs/open-questions.md #3, and a
 * control that does nothing is worse than no control.
 */
export function Controls() {
  const { copy, audio } = invitation;
  const [added, setAdded] = useState(false);
  const calendar = useRef<HTMLDetailsElement>(null);

  // A menu that opens should also close: on a tap anywhere else, and on
  // Escape, which hands focus back to the thing that opened it.
  useEffect(() => {
    const away = (e: Event) => {
      const d = calendar.current;
      if (d?.open && e.target instanceof Node && !d.contains(e.target)) d.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      const d = calendar.current;
      if (e.key !== "Escape" || !d?.open) return;
      d.open = false;
      d.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const close = () => {
    if (calendar.current) calendar.current.open = false;
  };

  return (
    <nav className={styles.bar} aria-label={copy.controls.barLabel}>
      {audio ? <SoundToggle /> : null}

      <a className={`${styles.action} ${styles.lead}`} href="#reply">
        {copy.controls.reply}
      </a>

      <span className={styles.actions}>
        <a className={styles.action} href="#stay">
          {copy.controls.stay}
        </a>

        <details ref={calendar} className={styles.calendar}>
          <summary className={styles.action}>
            {added ? copy.controls.calendarDone : copy.controls.calendar}
            <Caret />
          </summary>
          <span className={styles.menu}>
            <a
              className={styles.action}
              href={googleCalendarUrl()}
              target="_blank"
              rel="noreferrer noopener"
              onClick={close}
            >
              {copy.controls.calendarGoogle}
            </a>
            <a
              className={styles.action}
              href="/invitation.ics"
              download="advika-and-sooraj.ics"
              onClick={() => {
                setAdded(true);
                close();
              }}
            >
              {copy.controls.calendarFile}
            </a>
          </span>
        </details>
      </span>
    </nav>
  );
}

/** Says "this opens", and turns over when it has. Drawn, like every other mark
 *  here; it is a signifier for a disclosure, not an arrow glued to a link. */
function Caret() {
  return (
    <svg className={styles.caret} width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true">
      <path d="M1 4.8 4.5 1.4 8 4.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
