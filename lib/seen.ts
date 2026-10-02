/**
 * Set once the opening has been seen on this device.
 *
 * It lives here, in a module with no directive, because two things read it:
 * the envelope, which is a client component and writes the flag, and the
 * layout, which is a server component and inlines a pre-paint script that reads
 * it. It used to be exported from `components/Envelope.tsx`, and a value
 * imported from a `"use client"` module into a server one is not the value —
 * it is a reference to it. `JSON.stringify` of that is `undefined`, so for
 * three revisions the built page shipped `localStorage.getItem(undefined)`:
 * the flag was written on every visit and never once read, and a returning
 * guest was handed the sealed envelope again every time.
 *
 * Nothing caught it, because `tools/verify/console.js` sets the key itself
 * before it loads the page.
 */
export const SEEN_KEY = "advika-sooraj-envelope-seen";
