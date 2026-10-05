/** What `rsvp_list()` in supabase/schema.sql returns, for the replies page. */
export interface ListedReply {
  id: string;
  name: string;
  contact: string;
  muhurtham: number;
  reception: number;
  party: string[];
  dietary: string;
  note: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface Listed {
  replies: ListedReply[];
  totals: { replies: number; muhurtham: number; reception: number; declined: number; changed: number };
  /**
   * Whether the database's guards are on (supabase/schema.sql § Guards).
   * Missing altogether on a database set up before October 2026, until the
   * schema is run again.
   */
  guarded?: boolean;
}

/** What `rsvp_history_list()` returns: one version of one reply. */
export interface ListedVersion {
  /** Empty if the reply was deliberately removed; its versions stay. */
  reply_id: string | null;
  revision: number;
  received_at: string;
  /** "card" from the reply card, "by hand" from the database directly. */
  source: string;
  /** Whether this is the version that counts. */
  latest: boolean;
  reply: {
    name: string;
    contact: string;
    muhurtham: number;
    reception: number;
    party: string[];
    dietary: string;
    note: string;
  };
}
