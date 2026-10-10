"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { invitation } from "@/content/invitation";
import { price, type Gift } from "@/lib/registry/gift";
import { parseStored, readStored, subscribe, writeStored } from "@/lib/stored";
import styles from "./Registry.module.css";

const { registry } = invitation;

/**
 * The tokens this phone made when it chose gifts, by gift. The database keeps
 * only a hash of each, so this is the one place that can take a choice back.
 */
const KEY = "advika-sooraj-registry-chosen";

type Tokens = Record<string, string>;
type Failure = keyof typeof registry.failures | "taken";

function tokens(raw: string | null): Tokens {
  const parsed = parseStored<Tokens>(raw);
  return parsed && typeof parsed === "object" ? parsed : {};
}

/** 32 random bytes as 64 hex characters. Never leaves this phone except to be hashed. */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The list, and the two things a guest can do to it: choose a gift, and take
 * the choice back.
 *
 * The server sends the list as it stood. What the guest does here is shown at
 * once and then made true by the server, and if the server says no — someone
 * else chose it a moment earlier — the card says so and goes quiet. The list
 * is not re-sorted under a guest's finger: a chosen gift stays where it is
 * until the page is next opened, when it sinks below the ones still free.
 */
export function RegistryList({ gifts }: { gifts: Gift[] }) {
  const stored = useSyncExternalStore(subscribe, () => readStored(KEY), () => null);
  const mine = tokens(stored);
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Record<string, Failure | undefined>>({});

  const isClaimed = (g: Gift) => claimed[g.id] ?? g.claimed;

  async function send(gift: Gift, action: "claim" | "undo") {
    if (busy) return;
    setBusy(gift.id);
    setSaid((s) => ({ ...s, [gift.id]: undefined }));
    const token = action === "claim" ? newToken() : mine[gift.id];
    if (!token) {
      setBusy(null);
      return;
    }
    try {
      const res = await fetch("/api/registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, gift: gift.id, token }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; code?: string } | null;
      if (body?.ok === true) {
        const next = { ...tokens(readStored(KEY)) };
        if (action === "claim") next[gift.id] = token;
        else delete next[gift.id];
        writeStored(KEY, Object.keys(next).length ? JSON.stringify(next) : null);
        setClaimed((c) => ({ ...c, [gift.id]: action === "claim" }));
      } else if (body?.code === "taken" || body?.code === "gone") {
        // Chosen by someone else first, or taken off the list. Either way it is
        // not this guest's to choose any more.
        setClaimed((c) => ({ ...c, [gift.id]: true }));
        setSaid((s) => ({ ...s, [gift.id]: body.code === "taken" ? "taken" : "gone" }));
      } else if (body?.code === "refused") {
        // The family released it, or it was never this phone's. Forget the
        // token and show the card as the server now has it.
        const next = { ...tokens(readStored(KEY)) };
        delete next[gift.id];
        writeStored(KEY, Object.keys(next).length ? JSON.stringify(next) : null);
        setClaimed((c) => ({ ...c, [gift.id]: false }));
      } else {
        setSaid((s) => ({ ...s, [gift.id]: body?.code === "slow_down" ? "slow_down" : "unavailable" }));
      }
    } catch {
      setSaid((s) => ({ ...s, [gift.id]: "unavailable" }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className={styles.list}>
      {gifts.map((gift, index) => {
        const taken = isClaimed(gift);
        const yours = taken && Boolean(mine[gift.id]);
        const cost = price(gift.price_cents);
        const problem = said[gift.id];
        return (
          <li key={gift.id} className={styles.gift} data-chosen={(taken && !yours) || undefined}>
            <GiftPhoto src={gift.image} name={gift.name} priority={index < 4} />
            <div className={styles.words}>
              <h2 className={styles.name}>{gift.name}</h2>
              {gift.note && <p className={styles.note}>{gift.note}</p>}
              {cost && <p className={styles.price}>{cost}</p>}

              <div className={styles.actions}>
                {(!taken || yours) && (
                  <a className={styles.shop} href={gift.url} target="_blank" rel="noreferrer">
                    {gift.store ? `${registry.viewAt} ${gift.store}` : registry.viewOnline}
                  </a>
                )}
                {!taken && (
                  <button
                    className={styles.choose}
                    type="button"
                    onClick={() => send(gift, "claim")}
                    disabled={busy === gift.id}
                    aria-label={`${registry.claim}: ${gift.name}`}
                  >
                    {registry.claim}
                  </button>
                )}
                {taken && !yours && <p className={styles.chosen}>{registry.chosenByOther}</p>}
              </div>

              {yours && (
                <div className={styles.yours}>
                  <p>{registry.chosenByYou}</p>
                  <button
                    className={styles.undo}
                    type="button"
                    onClick={() => send(gift, "undo")}
                    disabled={busy === gift.id}
                    aria-label={`${registry.undo}: ${gift.name}`}
                  >
                    {registry.undo}
                  </button>
                </div>
              )}

              <p className={styles.problem} role="status" aria-live="polite">
                {problem === "taken"
                  ? registry.taken
                  : problem
                    ? registry.failures[problem]
                    : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The shop's photograph, exactly as the shop has it. The family chose that
 * over laying it into the paper, so the only things done to it are to keep it
 * whole inside a square of its own and to hold the square's place, so that
 * nothing below moves when it arrives.
 *
 * A shop that has moved or removed its picture leaves a gap in a card, and a
 * gap reads as broken: so a picture that fails, and a gift that has none, are
 * both shown as the same quiet blank of paper with the gift's first letter.
 *
 * The picture has no alternative text of its own: the gift's name stands
 * directly beside it as a heading, and saying it twice is not help.
 */
function GiftPhoto({ src, name, priority }: { src: string | null; name: string; priority: boolean }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // A picture can fail before this component is hydrated, and React never
  // hears of an error that happened first.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);
  const shown = src && !failed;
  return (
    <div className={styles.photo} data-blank={shown ? undefined : true}>
      {shown ? (
        // The shop's own picture from any host, which next/image would have to
        // be told about one host at a time and then resize on a quota.
        // eslint-disable-next-line @next/next/no-img-element -- see above
        <img
          ref={img}
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.initial} aria-hidden="true">
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
