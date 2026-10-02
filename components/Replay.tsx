"use client";

import { invitation } from "@/content/invitation";
import { SEEN_KEY } from "@/lib/seen";
import styles from "./Replay.module.css";

/**
 * "Replay the opening" — docs/design-brief.md §4: the envelope is "shown once
 * per device, with a discreet way to replay it".
 *
 * The brief has asked for this since the first revision and nobody noticed it
 * was missing, because the flag that makes the envelope show once was never
 * read (lib/seen.ts): every visit got the envelope, so there was nothing to
 * replay. Revision 9 fixed the flag, and the moment that worked a guest who
 * wanted to show the opening to someone across the table had no way to. The
 * copy string had been sitting in content/invitation.ts unused all along.
 *
 * It forgets that the envelope has been seen and loads the page again without
 * its hash, which is all "replay" needs to be: the pre-paint script does the
 * rest. A reload rather than re-arming in place, because the envelope unmounts
 * itself when it has finished and the simplest way to get a component back
 * exactly as it first was is to start again.
 *
 * At the very foot, below the kolam, in the smallest type on the page.
 * `docs/handoff-revision-7.md` says nothing else should go down there, and it
 * is right about ornament. This is not that: it is the page's one piece of
 * housekeeping, and the foot of a page is where housekeeping goes.
 */
export function Replay() {
  const replay = () => {
    try {
      window.localStorage.removeItem(SEEN_KEY);
    } catch {
      // Storage is blocked, so the flag was never kept and the envelope will
      // be there anyway.
    }
    window.location.assign(window.location.pathname);
  };

  return (
    <button type="button" className={styles.replay} onClick={replay}>
      {invitation.copy.controls.replay}
    </button>
  );
}
