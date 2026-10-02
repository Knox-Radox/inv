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
}
