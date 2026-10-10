import type { Metadata } from "next";
import { cookies } from "next/headers";
import { invitation } from "@/content/invitation";
import type { Listed } from "@/lib/rsvp/list";
import {
  SESSION_COOKIE,
  call,
  configured,
  diagnose,
  passcodeSet,
  sessionValid,
} from "@/lib/rsvp/server";
import styles from "./replies.module.css";

/**
 * The replies, for the family — docs/revision-9-plan.md § 8.
 *
 * The client chose this over reading the table in Supabase's dashboard: a page
 * the couple's parents can open with a passcode, with the two numbers a caterer
 * asks for at the top.
 *
 * It is the only page on the site that is rendered per request, and the only
 * one that reads the database. Nothing here is prerendered or cached: the
 * cookie is read first, which makes the route dynamic, and no reply is fetched
 * until that cookie has been checked.
 *
 * Its words are not in content/invitation.ts. That file is every string a
 * *guest* can see; this page is never linked from the invitation and a guest
 * cannot open it.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Replies",
  robots: { index: false, follow: false, nocache: true },
};

const when = new Intl.DateTimeFormat("en-US", {
  timeZone: invitation.day.timeZone,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Replies</h1>
      {children}
    </main>
  );
}

export default async function Replies({
  searchParams,
}: {
  searchParams: Promise<{ wrong?: string; wait?: string }>;
}) {
  const jar = await cookies();
  const flags = await searchParams;

  // Without a passcode nobody can be let in, so this much is said to anyone:
  // which of the settings this deployment was built without. Names only.
  if (!passcodeSet()) {
    return (
      <Shell>
        <p className={styles.lede}>
          This page is not switched on yet: this deployment has no <code>REPLIES_PASSCODE</code>
          {configured() ? "" : ", and no database address or key either"}. Set them in Vercel
          (Settings, Environment Variables) for this environment and redeploy. README.md,
          &ldquo;The RSVP&rdquo;, has the steps.
        </p>
      </Shell>
    );
  }

  if (!sessionValid(jar.get(SESSION_COOKIE)?.value)) {
    return (
      <Shell>
        <p className={styles.lede}>
          For {invitation.couple.both}&rsquo;s families. Enter the passcode to see who is coming.
        </p>
        <form className={styles.gate} method="post" action="/replies/enter">
          <label className={styles.label} htmlFor="passcode">
            Passcode
          </label>
          <input
            className={styles.input}
            id="passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={flags.wrong || flags.wait ? "gate-problem" : undefined}
          />
          <button className={styles.button} type="submit">
            Open
          </button>
          {(flags.wrong || flags.wait) && (
            <p className={styles.problem} id="gate-problem" role="alert">
              {flags.wait
                ? "Too many tries in a few minutes. Please wait ten minutes, then try again."
                : "That is not the passcode."}
            </p>
          )}
        </form>
      </Shell>
    );
  }

  const list = await call<Listed>("rsvp_list");
  if (!list.ok) {
    // Behind the passcode, so it can be specific: what is set, what kind of
    // thing each value is, and what the database said when it was asked.
    const findings = await diagnose();
    return (
      <Shell>
        <p className={styles.problem} role="alert">
          The replies cannot be read, and guests&rsquo; replies are not being taken either. This
          is why:
        </p>
        <ul className={styles.findings}>
          {findings.map((f) => (
            <li key={f.what} className={f.ok ? styles.fine : styles.wrong}>
              <span className={styles.findingWhat}>
                {f.what}: {f.ok ? "fine" : "needs attention"}
              </span>
              <span className={styles.findingDetail}>{f.detail}</span>
            </li>
          ))}
        </ul>
        <p className={styles.lede}>
          A deployment only sees the settings that existed when it was built: after changing one
          in Vercel, redeploy. Reload this page to check again. Every failed attempt is also
          written to the log (Vercel, Logs) on a line beginning <code>rsvp:</code>.
        </p>
        <form method="post" action="/replies/leave">
          <button className={styles.linkButton} type="submit">
            Sign out
          </button>
        </form>
      </Shell>
    );
  }

  const { replies, totals, guarded } = list.data;
  const [muhurtham, reception] = invitation.day.moments;

  return (
    <Shell>
      {guarded !== true && (
        <p className={styles.problem} role="alert">
          The database&rsquo;s safeguards are not switched on, so a reply deleted in Supabase would
          be gone for good. In Supabase, open SQL Editor, paste in the whole of{" "}
          <code>supabase/schema.sql</code> and press Run. It is safe on a database that already
          has replies, and this message goes away when it has worked.
        </p>
      )}
      <p className={styles.lede}>
        As of {when.format(new Date())}, Central time. A household that replies twice is counted
        once, by its latest answer; every earlier answer is kept, in the second download.
      </p>

      <dl className={styles.totals}>
        <div>
          <dd>{totals.muhurtham}</dd>
          <dt>
            {muhurtham.label}, {muhurtham.startDisplay}
          </dt>
        </div>
        <div>
          <dd>{totals.reception}</dd>
          <dt>
            {reception.label}, {reception.startDisplay}
          </dt>
        </div>
        <div>
          <dd>{totals.replies}</dd>
          <dt>{totals.replies === 1 ? "reply" : "replies"}, {totals.declined} of them declining both</dt>
        </div>
      </dl>

      <div className={styles.actions}>
        <a className={styles.link} href="/replies/export.csv">
          Download as a spreadsheet
        </a>
        <a className={styles.link} href="/replies/history.csv">
          Download every version
        </a>
        <a className={styles.link} href="/replies/registry">
          The registry
        </a>
        <form method="post" action="/replies/leave">
          <button className={styles.linkButton} type="submit">
            Sign out
          </button>
        </form>
      </div>

      {replies.length === 0 ? (
        <p className={styles.empty}>No one has replied yet. They will appear here as they do.</p>
      ) : (
        <ol className={styles.list}>
          {replies.map((r) => (
            <li key={r.id} className={styles.reply}>
              <div className={styles.who}>
                <p className={styles.name}>{r.name}</p>
                <p className={styles.contact}>{r.contact}</p>
              </div>
              <dl className={styles.counts}>
                <div>
                  <dt>{muhurtham.label}</dt>
                  <dd className={r.muhurtham === 0 ? styles.declines : undefined}>
                    {r.muhurtham === 0 ? "declines" : r.muhurtham}
                  </dd>
                </div>
                <div>
                  <dt>{reception.label}</dt>
                  <dd className={r.reception === 0 ? styles.declines : undefined}>
                    {r.reception === 0 ? "declines" : r.reception}
                  </dd>
                </div>
              </dl>
              <div className={styles.more}>
                {r.party.length > 0 && <p>With {r.party.join(", ")}</p>}
                {r.dietary && <p>Dietary: {r.dietary}</p>}
                {r.note && <p className={styles.note}>&ldquo;{r.note}&rdquo;</p>}
                <p className={styles.meta}>
                  {when.format(new Date(r.updated_at))}
                  {r.revision > 1 && `, version ${r.revision}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Shell>
  );
}
