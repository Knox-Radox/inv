import type { Metadata } from "next";
import Link from "next/link";
import { invitation } from "@/content/invitation";
import { RegistryList } from "@/components/registry/RegistryList";
import type { Gift } from "@/lib/registry/gift";
import { call } from "@/lib/rsvp/server";
import styles from "./registry.module.css";

/**
 * The registry — docs/revision-10-registry.md.
 *
 * A page of its own, reached by one quiet line at the close of the invitation,
 * and set in the invitation's idiom: the champagne field and its lattice, the
 * copperplate for the title, Mrs Eaves for everything a guest reads.
 *
 * It is read from the database for each guest who opens it, because what it
 * says changes as gifts are chosen, and a copy kept for a few minutes would
 * show a guest a gift as free that someone had just taken. One call, and the
 * call returns a few kilobytes: it costs a free Supabase project nothing it
 * would notice.
 *
 * The note about money comes first and the list second. The note is in the
 * page itself and not in the database, so it is there when the database is not.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: invitation.registry.title,
  robots: { index: false, follow: false },
};

export default async function RegistryPage() {
  const { registry, copy } = invitation;
  const listed = await call<Gift[]>("registry_list");
  const gifts = listed.ok && Array.isArray(listed.data) ? listed.data : null;

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link className={styles.back} href="/">
          {registry.backLabel}
        </Link>

        <h1 className={styles.title}>{registry.title}</h1>
        <p className={styles.welcome}>{registry.welcome}</p>

        {gifts === null ? (
          <p className={styles.said} role="alert">
            {registry.unavailable}
          </p>
        ) : gifts.length === 0 ? (
          <p className={styles.said}>{registry.empty}</p>
        ) : (
          <RegistryList gifts={gifts} />
        )}

        <p className={styles.signoff}>
          {copy.closingSignoff}
          <span className={styles.signature}>{copy.closingSignature}</span>
        </p>
      </div>
    </main>
  );
}
