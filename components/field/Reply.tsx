"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { invitation } from "@/content/invitation";
import { LIMITS, check, type Field, type Outcome, type Problem } from "@/lib/rsvp/reply";
import { parseStored, readStored, subscribe, writeStored } from "@/lib/stored";
import { Border } from "../art/Border";
import { ReplyEnvelope } from "./ReplyEnvelope";
import styles from "./Reply.module.css";

const { rsvp, day } = invitation;

/** A reply being written is kept here, so a failed send costs no retyping. */
const DRAFT_KEY = "advika-sooraj-reply-draft";
/** A reply that was sent, so the guest who comes back sees it sealed. */
const SENT_KEY = "advika-sooraj-reply-sent";

/** How long to wait for the server before calling it a failure. The route's own
 *  limit on the database is six seconds; this is that, and the trip. */
const SEND_TIMEOUT_MS = 12000;

/** How long the sealing takes, to the moment the words appear under it. Must
 *  agree with Reply.module.css § The sealing. */
const SEALING_MS = 3150;

type Answer = "accept" | "decline" | null;
type EventId = (typeof day.moments)[number]["id"];

interface Draft {
  name: string;
  contact: string;
  answer: Record<EventId, Answer>;
  count: Record<EventId, number>;
  party: string[];
  dietary: string;
  note: string;
}

interface Sent {
  name: string;
  muhurtham: number;
  reception: number;
  at: string;
}

const EMPTY: Draft = {
  name: "",
  contact: "",
  answer: { muhurtham: null, reception: null },
  count: { muhurtham: 1, reception: 1 },
  party: [],
  dietary: "",
  note: "",
};

type Mode = "card" | "sealing" | "sealed" | "closed";
type Problems = Partial<Record<Field, Problem>>;

/** An event's answer as the number the server stores: nobody, somebody, or
 *  not yet said. */
function attending(d: Draft, id: EventId): number | null {
  return d.answer[id] === "accept" ? d.count[id] : d.answer[id] === "decline" ? 0 : null;
}

/** Everyone coming besides the person writing the card. */
function others(d: Draft): number {
  return Math.max(0, Math.max(attending(d, "muhurtham") ?? 0, attending(d, "reception") ?? 0) - 1);
}

const CLOSES = Date.parse(rsvp.closesAt);

/** A draft from storage, made whole: an older draft may lack a newer field. */
function whole(raw: string | null): Draft | null {
  const d = parseStored<Partial<Draft>>(raw);
  if (!d) return null;
  return {
    ...EMPTY,
    ...d,
    answer: { ...EMPTY.answer, ...d.answer },
    count: { ...EMPTY.count, ...d.count },
    party: Array.isArray(d.party) ? d.party : [],
  };
}

/**
 * The reply card — docs/revision-9-plan.md § The idea.
 *
 * "There is no RSVP" was the last decision `CLAUDE.md` called settled, and the
 * client reversed it. What they asked for was a form; what a stationery suite
 * has is a *reply card*, and that is what this is — the same cotton sheet and
 * the same mirror-work border as the invitation, with blanks on ruled lines
 * and the two phrases a printed card offers, "accepts with pleasure" and
 * "declines with regret", which a guest circles.
 *
 * Then it does the one thing that makes this revision more than its parts.
 * The guest opened the couple's envelope to get here. When they send their
 * reply, a small card with their own name on it goes into an envelope of the
 * same paper, the flap comes down, and the couple's seal is pressed onto it:
 * the opening, run backwards. `ReplyEnvelope` is that.
 *
 * It answers one question — did my reply go? — and it does not start until
 * the server has said yes.
 *
 * Three things it is careful about:
 *
 * - **It is a real form.** `method="post"` to a real route with real field
 *   names, so a guest whose JavaScript never loaded can still reply, and the
 *   number of guests is revealed by CSS (`:has`), not by script.
 * - **Nothing typed is lost.** The draft is saved on the device as it is
 *   written. A failed send says so, and says the reply is still there.
 * - **It never asks the server what it holds.** A guest who comes back sees
 *   their reply sealed because their own device remembers it. There is no
 *   request that could show one household another's answer.
 */
export function Reply() {
  // What this device remembers — a reply already sent, one half written — read
  // as the external store it is. On the server, and for the first render in
  // the browser, there is neither: the card is simply the card.
  const sentRaw = useSyncExternalStore(subscribe, () => readStored(SENT_KEY), () => null);
  const draftRaw = useSyncExternalStore(subscribe, () => readStored(DRAFT_KEY), () => null);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const closed = useSyncExternalStore(subscribe, () => Date.now() >= CLOSES, () => false);
  const sent = useMemo(() => parseStored<Sent>(sentRaw), [sentRaw]);
  const stored = useMemo(() => whole(draftRaw), [draftRaw]);

  // What has been typed since. Null until the guest touches the card, so that
  // until then the card shows what was stored.
  const [edited, setEdited] = useState<Draft | null>(null);
  const draft = edited ?? stored ?? EMPTY;

  const [phase, setPhase] = useState<"idle" | "sealing" | "editing">("idle");
  const [problems, setProblems] = useState<Problems>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const mode: Mode =
    phase === "sealing" ? "sealing" : sent && phase !== "editing" ? "sealed" : closed ? "closed" : "card";

  const form = useRef<HTMLFormElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const section = useRef<HTMLElement>(null);
  const uid = useId();

  // Saved as it is written, a moment after the guest stops.
  useEffect(() => {
    if (!edited) return;
    const timer = window.setTimeout(() => writeStored(DRAFT_KEY, JSON.stringify(edited)), 400);
    return () => window.clearTimeout(timer);
  }, [edited]);

  const update = (change: (d: Draft) => Draft) => setEdited((d) => change(d ?? stored ?? EMPTY));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => update((d) => ({ ...d, [key]: value }));

  const clear = (field: Field) =>
    setProblems((p) => {
      if (!(field in p)) return p;
      const next = { ...p };
      delete next[field];
      return next;
    });

  const answer = (id: EventId, value: Answer) => {
    update((d) => ({ ...d, answer: { ...d.answer, [id]: value } }));
    clear(id);
  };

  const count = (id: EventId, to: (n: number) => number) =>
    update((d) => ({
      ...d,
      count: { ...d.count, [id]: Math.min(LIMITS.guests, Math.max(1, to(d.count[id]))) },
    }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;

    const body = {
      name: draft.name,
      contact: draft.contact,
      muhurtham: attending(draft, "muhurtham"),
      reception: attending(draft, "reception"),
      party: draft.party.slice(0, others(draft)),
      dietary: draft.dietary,
      note: draft.note,
      website: new FormData(e.currentTarget).get("website") ?? "",
    };

    const checked = check(body);
    if (!checked.ok) {
      setProblems(checked.problems);
      setFailure(rsvp.failures.invalid);
      // To the first line that needs attention, by the order they are on the card.
      const order: Field[] = ["name", "muhurtham", "reception", "party", "dietary", "contact", "note"];
      const first = order.find((f) => f in checked.problems);
      const target = first && form.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
      target?.focus();
      return;
    }

    setProblems({});
    setFailure(null);
    setSending(true);

    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), SEND_TIMEOUT_MS);
    let outcome: Outcome;
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abort.signal,
      });
      outcome = (await res.json()) as Outcome;
    } catch {
      outcome = { ok: false, code: "unavailable" };
    } finally {
      window.clearTimeout(timer);
    }
    setSending(false);

    if (!outcome.ok) {
      if (outcome.code === "invalid" && outcome.problems) setProblems(outcome.problems);
      setFailure(rsvp.failures[outcome.code] ?? rsvp.failures.unavailable);
      return;
    }

    const record: Sent = {
      name: checked.reply.name,
      muhurtham: checked.reply.muhurtham,
      reception: checked.reply.reception,
      at: new Date().toISOString(),
    };
    writeStored(DRAFT_KEY, JSON.stringify(draft));
    writeStored(SENT_KEY, JSON.stringify(record));

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase(still ? "idle" : "sealing");
    // Bring the envelope to where the guest is looking: they pressed a button
    // at the foot of a long card, and the thing that answers it is at the top.
    section.current?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    window.setTimeout(
      () => {
        setPhase("idle");
        status.current?.focus({ preventScroll: true });
      },
      still ? 60 : SEALING_MS,
    );
  };

  const change = () => {
    setPhase("editing");
    setFailure(null);
    window.requestAnimationFrame(() => {
      form.current?.querySelector<HTMLElement>('[data-field="name"]')?.focus({ preventScroll: true });
    });
  };

  const extra = others(draft);
  const coming = attending(draft, "muhurtham") || attending(draft, "reception");

  const said = (field: Field, group: keyof typeof rsvp.problems) => {
    const problem = problems[field];
    if (!problem) return null;
    const words = rsvp.problems[group] as Partial<Record<Problem, string>>;
    return words[problem] ?? rsvp.failures.invalid;
  };

  return (
    <section ref={section} className={styles.section} aria-labelledby="reply" data-mode={mode}>
      <h2 id="reply" className={styles.title}>
        {rsvp.title}
      </h2>

      {/* For a guest whose JavaScript did not load: the route sends them back
          to one of these, and `:target` is what shows it. */}
      <p id="reply-sent" className={styles.plain}>
        {rsvp.plainSent}
      </p>
      <p id="reply-problem" className={styles.plain}>
        {rsvp.plainProblem}
      </p>

      {(mode === "sealing" || mode === "sealed") && sent && (
        <div className={styles.keepsake}>
          <ReplyEnvelope
            name={sent.name}
            line={sent.muhurtham + sent.reception > 0 ? rsvp.accepts : rsvp.declines}
            sealing={mode === "sealing"}
          />
          <div className={styles.after}>
            <p ref={status} className={styles.sentTitle} tabIndex={-1} role="status">
              {rsvp.sent}
            </p>
            <p className={styles.thanks}>{rsvp.thanks}</p>
            <dl className={styles.summary}>
              {day.moments.map((m) => {
                const n = sent[m.id];
                return (
                  <div key={m.id}>
                    <dt>{m.label}</dt>
                    <dd>{n > 0 ? `${n} ${rsvp.summaryAccepts}` : rsvp.summaryDeclines}</dd>
                  </div>
                );
              })}
            </dl>
            {!closed && (
              <button type="button" className={styles.change} onClick={change}>
                {rsvp.change}
              </button>
            )}
          </div>
        </div>
      )}

      {mode === "closed" && (
        <div className={styles.closed}>
          <p className={styles.closedLine}>
            {rsvp.closed} {rsvp.replyByDisplay}.
          </p>
          <p>{rsvp.closedHelp}</p>
        </div>
      )}

      <form
        ref={form}
        className={styles.card}
        method="post"
        action="/api/rsvp"
        // The card checks itself once its script is running, in its own words.
        // Until then — and for a guest whose script never arrives — the
        // browser's own checking is left on, so a plain form post is not sent
        // with the name blank.
        noValidate={hydrated}
        onSubmit={submit}
        hidden={mode !== "card"}
        aria-describedby={failure ? `${uid}-failure` : undefined}
      >
        <div className={styles.paper} aria-hidden="true" />
        <Border />

        <div className={styles.inner}>
          <p className={styles.request}>
            {rsvp.request} <span className={styles.by}>{rsvp.replyByDisplay}</span>
          </p>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-name`}>
              {rsvp.name}
            </label>
            <input
              className={styles.line}
              id={`${uid}-name`}
              data-field="name"
              name="name"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              spellCheck={false}
              maxLength={LIMITS.name}
              required
              value={draft.name}
              onChange={(e) => {
                set("name", e.target.value);
                clear("name");
              }}
              aria-invalid={problems.name ? true : undefined}
              aria-describedby={problems.name ? `${uid}-name-problem` : undefined}
            />
            {problems.name && (
              <p className={styles.problem} id={`${uid}-name-problem`}>
                {said("name", "name")}
              </p>
            )}
          </div>

          {day.moments.map((m) => {
            const problem = said(m.id, "event");
            return (
              <fieldset
                key={m.id}
                className={styles.event}
                aria-describedby={problem ? `${uid}-${m.id}-problem` : undefined}
              >
                <legend className={styles.legend}>
                  {m.label}, <span className={styles.at}>{m.startDisplay}</span>
                </legend>

                <div className={styles.choices}>
                  {(["accept", "decline"] as const).map((value, i) => (
                    <label key={value} className={styles.choice}>
                      <input
                        className={styles.radio}
                        type="radio"
                        name={m.id}
                        value={value}
                        required
                        data-field={i === 0 ? m.id : undefined}
                        checked={draft.answer[m.id] === value}
                        onChange={() => answer(m.id, value)}
                      />
                      <span className={styles.phrase}>
                        {value === "accept" ? rsvp.accepts : rsvp.declines}
                        <Circled wander={i as 0 | 1} />
                      </span>
                    </label>
                  ))}
                </div>

                <div className={styles.count}>
                  <label className={styles.label} htmlFor={`${uid}-${m.id}-count`}>
                    {rsvp.attending}
                  </label>
                  <span className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.step}
                      aria-label={rsvp.fewer}
                      onClick={() => count(m.id, (n) => n - 1)}
                      disabled={draft.count[m.id] <= 1}
                    >
                      <Minus />
                    </button>
                    <input
                      className={styles.number}
                      id={`${uid}-${m.id}-count`}
                      name={`${m.id}_count`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={LIMITS.guests}
                      value={draft.count[m.id]}
                      onChange={(e) => {
                        const n = Math.round(Number(e.target.value));
                        if (Number.isFinite(n)) count(m.id, () => n);
                      }}
                    />
                    <button
                      type="button"
                      className={styles.step}
                      aria-label={rsvp.more}
                      onClick={() => count(m.id, (n) => n + 1)}
                      disabled={draft.count[m.id] >= LIMITS.guests}
                    >
                      <Plus />
                    </button>
                  </span>
                </div>

                {problem && (
                  <p className={styles.problem} id={`${uid}-${m.id}-problem`}>
                    {problem}
                  </p>
                )}
              </fieldset>
            );
          })}

          {extra > 0 && (
            <fieldset className={styles.party}>
              <legend className={styles.label}>{rsvp.party}</legend>
              {Array.from({ length: extra }, (_, i) => (
                <input
                  key={i}
                  className={styles.line}
                  name="party"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  maxLength={LIMITS.partyName}
                  data-field={i === 0 ? "party" : undefined}
                  aria-label={`${rsvp.partyLine} ${i + 2}`}
                  placeholder={`${rsvp.partyLine} ${i + 2}`}
                  value={draft.party[i] ?? ""}
                  onChange={(e) => {
                    const next = [...draft.party];
                    next[i] = e.target.value;
                    set("party", next);
                    clear("party");
                  }}
                />
              ))}
              {problems.party && <p className={styles.problem}>{said("party", "party")}</p>}
            </fieldset>
          )}

          {/* Asked only of someone who is coming. A guest who has just declined
              is not then asked what they eat. */}
          <div className={styles.field} hidden={hydrated && !coming}>
            <label className={styles.label} htmlFor={`${uid}-dietary`}>
              {rsvp.dietary}
            </label>
            <textarea
              className={styles.lines}
              id={`${uid}-dietary`}
              data-field="dietary"
              name="dietary"
              rows={2}
              maxLength={LIMITS.dietary}
              value={draft.dietary}
              onChange={(e) => {
                set("dietary", e.target.value);
                clear("dietary");
              }}
            />
            {problems.dietary && <p className={styles.problem}>{said("dietary", "dietary")}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-contact`}>
              {rsvp.contact}
            </label>
            <input
              className={styles.line}
              id={`${uid}-contact`}
              data-field="contact"
              name="contact"
              type="text"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={LIMITS.contact}
              required
              value={draft.contact}
              onChange={(e) => {
                set("contact", e.target.value);
                clear("contact");
              }}
              aria-invalid={problems.contact ? true : undefined}
              aria-describedby={`${uid}-contact-hint${problems.contact ? ` ${uid}-contact-problem` : ""}`}
            />
            {problems.contact && (
              <p className={styles.problem} id={`${uid}-contact-problem`}>
                {said("contact", "contact")}
              </p>
            )}
            <p className={styles.hint} id={`${uid}-contact-hint`}>
              {rsvp.contactHint}
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-note`}>
              {rsvp.note}
            </label>
            <textarea
              className={styles.lines}
              id={`${uid}-note`}
              data-field="note"
              name="note"
              rows={3}
              maxLength={LIMITS.note}
              value={draft.note}
              onChange={(e) => {
                set("note", e.target.value);
                clear("note");
              }}
            />
            {problems.note && <p className={styles.problem}>{said("note", "note")}</p>}
          </div>

          {/* Not for people. Off the page, out of the tab order and hidden from
              assistive technology; something that fills it in is not a guest. */}
          <div className={styles.trap} aria-hidden="true">
            <label htmlFor={`${uid}-website`}>Website</label>
            <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className={styles.foot}>
            <p className={styles.failure} id={`${uid}-failure`} role="alert">
              {failure}
            </p>
            <button type="submit" className={styles.send} aria-busy={sending || undefined}>
              {sending ? `${rsvp.sending}…` : rsvp.send}
            </button>
            <p className={styles.privacy}>{rsvp.privacy}</p>
          </div>
        </div>
      </form>

    </section>
  );
}

/**
 * The ring a guest's pen puts round the phrase they choose — which is how a
 * printed reply card is actually filled in. Drawn as a hand draws one: not an
 * ellipse, and it overshoots where it closes. Two of them, so the two phrases
 * on a line are not circled by the same hand movement.
 */
function Circled({ wander }: { wander: 0 | 1 }) {
  const d = wander
    ? "M14 31C10 16 44 5 104 5C162 5 193 15 192 30C191 46 156 56 100 56C46 56 9 47 12 28C13 21 20 15 31 11"
    : "M17 27C16 13 52 4 106 5C160 6 194 16 191 31C188 47 150 56 96 55C44 54 8 45 10 28C11 22 18 16 28 12";
  return (
    <svg className={styles.ring} viewBox="0 0 202 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={d} pathLength={1} />
    </svg>
  );
}

function Minus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7h9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7h9M7 2.5v9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
