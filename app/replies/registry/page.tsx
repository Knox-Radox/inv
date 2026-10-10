import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { invitation } from "@/content/invitation";
import { PhotoField } from "@/components/registry/PhotoField";
import { PROBLEMS, price, priceField, type AdminGift, type AdminListing, type GiftProblem } from "@/lib/registry/gift";
import { SESSION_COOKIE, call, passcodeSet, sessionValid } from "@/lib/rsvp/server";
import styles from "./admin.module.css";

/**
 * The registry, for the family — docs/revision-10-registry.md.
 *
 * Behind the same passcode as the replies, and under the same path so the same
 * cookie opens it. A guest cannot reach it and the invitation never links to
 * it, so its words are not in content/invitation.ts.
 *
 * No JavaScript is needed to use any of it: every button is a form. The one
 * script on the page makes a chosen photograph smaller before it is sent.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registry, for the family",
  robots: { index: false, follow: false, nocache: true },
};

const when = new Intl.DateTimeFormat("en-US", {
  timeZone: invitation.day.timeZone,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const SAID: Record<string, string> = {
  added: "Added. It is on the registry now.",
  edited: "Saved.",
  archive: "Taken off the registry. It is kept here, under Taken off, and can be put back.",
  restore: "Put back at the end of the list.",
  release: "Let go. The gift is free to be chosen again.",
};

function GiftForm({ gift }: { gift?: AdminGift }) {
  return (
    <form className={styles.form} method="post" action="/replies/registry/save" encType="multipart/form-data">
      {gift && <input type="hidden" name="id" value={gift.id} />}
      <div className={styles.field}>
        <label htmlFor={`name-${gift?.id ?? "new"}`}>Name of the gift</label>
        <input id={`name-${gift?.id ?? "new"}`} name="name" required maxLength={120} defaultValue={gift?.name ?? ""} autoComplete="off" />
      </div>
      <div className={styles.field}>
        <label htmlFor={`url-${gift?.id ?? "new"}`}>Link to the shop&rsquo;s page</label>
        <input id={`url-${gift?.id ?? "new"}`} name="url" type="text" inputMode="url" required placeholder="https://" defaultValue={gift?.url ?? ""} autoComplete="off" />
      </div>
      <div className={styles.pair}>
        <div className={styles.field}>
          <label htmlFor={`store-${gift?.id ?? "new"}`}>Shop (optional)</label>
          <input id={`store-${gift?.id ?? "new"}`} name="store" maxLength={60} defaultValue={gift?.store ?? ""} autoComplete="off" />
          <p className={styles.help}>Left empty, it is taken from the link.</p>
        </div>
        <div className={styles.field}>
          <label htmlFor={`price-${gift?.id ?? "new"}`}>Price in dollars (optional)</label>
          <input id={`price-${gift?.id ?? "new"}`} name="price" inputMode="decimal" defaultValue={gift ? priceField(gift.price_cents) : ""} autoComplete="off" />
          <p className={styles.help}>Left empty, none is shown.</p>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={`note-${gift?.id ?? "new"}`}>A line about it (optional)</label>
        <input id={`note-${gift?.id ?? "new"}`} name="note" maxLength={160} defaultValue={gift?.note ?? ""} autoComplete="off" />
        <p className={styles.help}>A colour or a size, for instance.</p>
      </div>
      <PhotoField current={gift?.image ?? null} />
      <button className={styles.button} type="submit">
        {gift ? "Save changes" : "Add to the registry"}
      </button>
    </form>
  );
}

export default async function RegistryAdmin({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; did?: string; problem?: string }>;
}) {
  const jar = await cookies();
  // The passcode is asked for on /replies, and this is where it sends you back.
  if (!passcodeSet() || !sessionValid(jar.get(SESSION_COOKIE)?.value)) redirect("/replies");

  const flags = await searchParams;
  const listed = await call<AdminListing>("registry_list_all");

  const said = flags.saved ? SAID[flags.saved] : flags.did ? SAID[flags.did] : undefined;
  const problem = flags.problem && flags.problem in PROBLEMS ? PROBLEMS[flags.problem as GiftProblem] : undefined;

  const gifts = listed.ok ? listed.data.gifts : [];
  const live = gifts.filter((g) => !g.archived_at);
  const away = gifts.filter((g) => g.archived_at);
  const chosen = live.filter((g) => g.claimed_at).length;
  const names = new Map(gifts.map((g) => [g.id, g.name]));

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Registry</h1>
      <div className={styles.actions}>
        <a className={styles.link} href="/replies">
          Replies
        </a>
        <a className={styles.link} href="/registry" target="_blank" rel="noreferrer">
          See it as a guest sees it
        </a>
        <form method="post" action="/replies/leave">
          <button className={styles.linkButton} type="submit">
            Sign out
          </button>
        </form>
      </div>

      {said && (
        <p className={styles.said} role="status">
          {said}
        </p>
      )}
      {problem && (
        <p className={styles.problem} role="alert">
          {problem}
        </p>
      )}

      {!listed.ok ? (
        <p className={styles.problem} role="alert">
          The registry cannot be read. In Supabase, open SQL Editor, paste in the whole of{" "}
          <code>supabase/registry.sql</code> and press Run (after <code>supabase/schema.sql</code>, if that has not been
          run). If it has been, the check-up on the Replies page says what else is wrong.
        </p>
      ) : (
        <>
          <p className={styles.lede}>
            {live.length === 0
              ? "Nothing is on the registry yet. Add the first gift below."
              : `${live.length} ${live.length === 1 ? "gift" : "gifts"} on the registry, ${chosen} of them chosen by a guest.`}{" "}
            Gifts go on the page in the order below, with the ones already chosen after the others. Nothing here deletes a
            gift: taking one off keeps it, and a choice a guest made is kept in the log below.
          </p>

          <section aria-labelledby="add" className={styles.section}>
            <h2 id="add" className={styles.heading}>
              Add a gift
            </h2>
            <GiftForm />
          </section>

          {live.length > 0 && (
            <section aria-labelledby="on" className={styles.section}>
              <h2 id="on" className={styles.heading}>
                On the registry
              </h2>
              <ol className={styles.list}>
                {live.map((g, i) => (
                  <GiftRow key={g.id} gift={g} first={i === 0} last={i === live.length - 1} />
                ))}
              </ol>
            </section>
          )}

          {away.length > 0 && (
            <section aria-labelledby="off" className={styles.section}>
              <h2 id="off" className={styles.heading}>
                Taken off
              </h2>
              <ol className={styles.list}>
                {away.map((g) => (
                  <GiftRow key={g.id} gift={g} first last />
                ))}
              </ol>
            </section>
          )}

          {listed.data.log.length > 0 && (
            <details className={styles.log}>
              <summary>What has happened, most recent first</summary>
              <ul>
                {listed.data.log.map((e, i) => (
                  <li key={i}>
                    {when.format(new Date(e.at))}: {e.event}
                    {e.gift_id && names.has(e.gift_id) ? `, ${names.get(e.gift_id)}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </main>
  );
}

function GiftRow({ gift, first, last }: { gift: AdminGift; first: boolean; last: boolean }) {
  const cost = price(gift.price_cents);
  return (
    <li id={`gift-${gift.id}`} className={styles.row}>
      <div className={styles.thumb}>
        {gift.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- the family's own list, any host
          <img src={gift.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true">{gift.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className={styles.what}>
        <p className={styles.name}>{gift.name}</p>
        <p className={styles.meta}>
          <a href={gift.url} target="_blank" rel="noreferrer">
            {gift.store || "Link"}
          </a>
          {cost ? `, ${cost}` : ""}
        </p>
        {gift.note && <p className={styles.meta}>{gift.note}</p>}
        <p className={gift.claimed_at ? styles.chosen : styles.meta}>
          {gift.claimed_at ? `Chosen by a guest, ${when.format(new Date(gift.claimed_at))}` : gift.archived_at ? "Taken off the registry" : "Free to be chosen"}
        </p>
      </div>
      <form className={styles.buttons} method="post" action="/replies/registry/act">
        <input type="hidden" name="gift" value={gift.id} />
        {!gift.archived_at && !first && (
          <button className={styles.small} name="action" value="up">
            Move up
          </button>
        )}
        {!gift.archived_at && !last && (
          <button className={styles.small} name="action" value="down">
            Move down
          </button>
        )}
        {gift.claimed_at && (
          <button className={styles.small} name="action" value="release">
            Let go of the choice
          </button>
        )}
        {gift.archived_at ? (
          <button className={styles.small} name="action" value="restore">
            Put back
          </button>
        ) : (
          <button className={styles.small} name="action" value="archive">
            Take off
          </button>
        )}
      </form>
      <details className={styles.edit}>
        <summary>Edit</summary>
        <GiftForm gift={gift} />
      </details>
    </li>
  );
}
