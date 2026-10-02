-- Advika & Sooraj: where the replies are kept.
--
-- Run this once, in the Supabase dashboard's SQL editor, on a new project.
-- It is safe to run again: every statement either checks first or replaces.
-- README.md § The RSVP has the five steps around it.
--
-- Three tables and six functions, and one rule that explains all of it:
--
--   NOTHING HERE CAN BE REACHED WITH THE PROJECT'S PUBLIC KEY.
--
-- Row-level security is on for every table and there are no policies, so the
-- `anon` and `authenticated` roles — the ones a browser can act as — can read
-- nothing and write nothing. The functions are the only way in, and EXECUTE on
-- each is granted to `service_role` alone, which is the role the *secret* key
-- maps to. That key lives in Vercel's environment and nowhere else.
--
-- So the site's server calls a function; the function decides. A guest's
-- browser never talks to this database at all.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per household that has replied. A second reply from the same phone
-- number or email replaces the first rather than adding to the headcount:
-- `contact_key` is that phone or email, normalised by the server.
create table if not exists public.rsvp_replies (
  id          uuid primary key default gen_random_uuid(),
  contact_key text        not null unique,
  contact     text        not null,           -- as the guest typed it
  name        text        not null,
  muhurtham   smallint    not null,           -- how many are coming; 0 declines
  reception   smallint    not null,
  party       text[]      not null default '{}',  -- everyone else's names
  dietary     text        not null default '',
  note        text        not null default '',
  revision    integer     not null default 1,     -- 1, then 2 if they changed it
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint rsvp_muhurtham_range check (muhurtham between 0 and 10),
  constraint rsvp_reception_range check (reception between 0 and 10),
  constraint rsvp_name_length     check (char_length(name) between 1 and 80),
  constraint rsvp_contact_length  check (char_length(contact) between 3 and 120),
  constraint rsvp_party_size      check (cardinality(party) <= 9),
  constraint rsvp_dietary_length  check (char_length(dietary) <= 400),
  constraint rsvp_note_length     check (char_length(note) <= 800)
);

-- Every reply as it arrived, including the ones a later reply replaced. The
-- latest answer is the one that counts, but nothing a guest sent is ever lost,
-- and if somebody's reply is changed from a device that is not theirs, this is
-- where it shows.
create table if not exists public.rsvp_history (
  id          bigint generated always as identity primary key,
  reply_id    uuid        not null references public.rsvp_replies (id) on delete cascade,
  revision    integer     not null,
  received_at timestamptz not null default now(),
  reply       jsonb       not null,
  -- A keyed hash of the sender's address. It tells one sender from another; it
  -- cannot be turned back into an address, and it is erased after two days
  -- (rsvp_sweep). See lib/rsvp/server.ts.
  via         text        not null default ''
);

create index if not exists rsvp_history_reply on public.rsvp_history (reply_id, revision);

-- Counters for the rate limits. A row is a bucket in a window of time, and
-- rows older than two days are swept out as new ones arrive.
create table if not exists public.rsvp_rate (
  bucket text        not null,
  slot   timestamptz not null,
  hits   integer     not null default 0,
  primary key (bucket, slot)
);

alter table public.rsvp_replies enable row level security;
alter table public.rsvp_history enable row level security;
alter table public.rsvp_rate    enable row level security;

-- Supabase grants the API roles access to every new table in `public`. Row-level
-- security with no policies already makes that access empty; this takes it away
-- as well, so that a policy added by mistake later still opens nothing.
revoke all on public.rsvp_replies, public.rsvp_history, public.rsvp_rate
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
-- All SECURITY DEFINER, so they run as the owner and the API roles need no
-- rights on the tables; all with an empty search_path, so every name in them is
-- written out in full and none can be redirected.

-- One more hit on a bucket, and whether it is still inside its limit.
create or replace function public.rsvp_hit(p_bucket text, p_window integer, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window) * p_window);
  v_hits integer;
begin
  insert into public.rsvp_rate as r (bucket, slot, hits)
  values (p_bucket, v_slot, 1)
  on conflict (bucket, slot) do update set hits = r.hits + 1
  returning r.hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- What is only needed while it is fresh, cleared away: the rate counters, and
-- the hash of who sent each reply. Two days is long enough to count attempts
-- and to see that a reply was changed by somebody else; after that the history
-- keeps what was said and forgets who by.
create or replace function public.rsvp_sweep()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rsvp_rate where slot < now() - interval '2 days';
  update public.rsvp_history set via = ''
   where via <> '' and received_at < now() - interval '2 days';
$$;

-- Take one reply.
--
-- The site's server has already checked it; this checks it again, because a
-- database that trusts its only caller has two things that can be wrong
-- instead of one. Every outcome a guest can cause comes back as a value —
-- {"ok": false, "code": "..."} — and never as an error, so that an error
-- always means something is actually broken.
create or replace function public.rsvp_submit(p_reply jsonb, p_caller text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text := btrim(coalesce(p_reply ->> 'name', ''));
  v_contact text := btrim(coalesce(p_reply ->> 'contact', ''));
  v_key     text := coalesce(p_reply ->> 'contactKey', '');
  v_dietary text := btrim(coalesce(p_reply ->> 'dietary', ''));
  v_note    text := btrim(coalesce(p_reply ->> 'note', ''));
  v_m       integer;
  v_r       integer;
  v_party   text[];
  v_id      uuid;
  v_rev     integer;
  c_invalid constant jsonb := jsonb_build_object('ok', false, 'code', 'invalid');
begin
  if p_caller is null or char_length(p_caller) not between 8 and 128 then
    return c_invalid;
  end if;

  -- Limits, before anything is read: eight replies in ten minutes and forty in
  -- a day from one sender, six hundred an hour from everybody. A wedding with
  -- three hundred guests does not reach any of them; a script does at once.
  if not public.rsvp_hit('ip:' || p_caller, 600, 8) then
    return jsonb_build_object('ok', false, 'code', 'slow_down');
  end if;
  if not public.rsvp_hit('ipd:' || p_caller, 86400, 40) then
    return jsonb_build_object('ok', false, 'code', 'slow_down');
  end if;
  if not public.rsvp_hit('all', 3600, 600) then
    return jsonb_build_object('ok', false, 'code', 'busy');
  end if;

  begin
    v_m := (p_reply ->> 'muhurtham')::integer;
    v_r := (p_reply ->> 'reception')::integer;
    select coalesce(array_agg(left(btrim(x), 80)) filter (where btrim(x) <> ''), '{}')
      into v_party
      from jsonb_array_elements_text(coalesce(p_reply -> 'party', '[]'::jsonb)) as t (x);
  exception when others then
    return c_invalid;
  end;

  if v_m is null or v_r is null or v_m not between 0 and 10 or v_r not between 0 and 10
     or char_length(v_name) not between 1 and 80
     or char_length(v_contact) not between 3 and 120
     or char_length(v_key) > 130
     or v_key !~ '^(p:[0-9]{7,15}|e:[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,})$'
     or cardinality(v_party) > 9
     or char_length(v_dietary) > 400
     or char_length(v_note) > 800
  then
    return c_invalid;
  end if;

  -- A ceiling on the table itself. Far above any guest list, and it means the
  -- worst a flood can do is fill a table that has a bottom.
  if (select count(*) from public.rsvp_replies) >= 5000
     and not exists (select 1 from public.rsvp_replies where contact_key = v_key)
  then
    return jsonb_build_object('ok', false, 'code', 'busy');
  end if;

  insert into public.rsvp_replies as r
    (contact_key, contact, name, muhurtham, reception, party, dietary, note)
  values
    (v_key, v_contact, v_name, v_m, v_r, v_party, v_dietary, v_note)
  on conflict (contact_key) do update set
    contact    = excluded.contact,
    name       = excluded.name,
    muhurtham  = excluded.muhurtham,
    reception  = excluded.reception,
    party      = excluded.party,
    dietary    = excluded.dietary,
    note       = excluded.note,
    revision   = r.revision + 1,
    updated_at = now()
  returning r.id, r.revision into v_id, v_rev;

  insert into public.rsvp_history (reply_id, revision, reply, via)
  values (v_id, v_rev, p_reply - 'contactKey', p_caller);

  perform public.rsvp_sweep();

  -- Deliberately the same answer for a first reply and for a replacement. If
  -- it said which, the form could be used to find out whether a phone number
  -- had already replied.
  return jsonb_build_object('ok', true);
end;
$$;

-- Everything, for the private page: the replies newest first, and the totals.
create or replace function public.rsvp_list()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'replies', coalesce(
      (select jsonb_agg(to_jsonb(r) - 'contact_key' order by r.updated_at desc)
         from public.rsvp_replies r),
      '[]'::jsonb),
    'totals', (
      select jsonb_build_object(
        'replies',   count(*),
        'muhurtham', coalesce(sum(muhurtham), 0),
        'reception', coalesce(sum(reception), 0),
        'declined',  count(*) filter (where muhurtham = 0 and reception = 0),
        'changed',   count(*) filter (where revision > 1))
        from public.rsvp_replies)
  );
$$;

-- One more wrong passcode from this sender, and whether they may try again:
-- eight in ten minutes.
create or replace function public.rsvp_gate(p_caller text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.rsvp_hit('gate:' || coalesce(p_caller, ''), 600, 8);
$$;

-- A real query, for the daily request that keeps a free project from being
-- paused: Supabase pauses a project that has had no activity for a week. It
-- sweeps as well, so the sender hashes go two days after the *last* reply and
-- not only when the next one happens to arrive.
create or replace function public.rsvp_ping()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.rsvp_sweep();
  return jsonb_build_object('ok', true, 'replies', (select count(*) from public.rsvp_replies));
end;
$$;

-- Postgres gives EXECUTE on a new function to everybody, and Supabase's API
-- roles inherit that. Take it back from all of them and give it to one.
revoke all on function public.rsvp_hit(text, integer, integer) from public, anon, authenticated, service_role;
revoke all on function public.rsvp_submit(jsonb, text)         from public, anon, authenticated;
revoke all on function public.rsvp_list()                      from public, anon, authenticated;
revoke all on function public.rsvp_gate(text)                  from public, anon, authenticated;
revoke all on function public.rsvp_ping()                      from public, anon, authenticated;
revoke all on function public.rsvp_sweep()                     from public, anon, authenticated, service_role;

grant execute on function public.rsvp_submit(jsonb, text) to service_role;
grant execute on function public.rsvp_list()              to service_role;
grant execute on function public.rsvp_gate(text)          to service_role;
grant execute on function public.rsvp_ping()              to service_role;
-- rsvp_hit and rsvp_sweep are granted to nobody: only the functions above
-- call them.

commit;

-- To check it took, run this. Every line should say `false`:
--
--   select has_function_privilege('anon', 'public.rsvp_submit(jsonb, text)', 'execute'),
--          has_function_privilege('anon', 'public.rsvp_list()', 'execute'),
--          has_function_privilege('authenticated', 'public.rsvp_list()', 'execute'),
--          has_table_privilege('anon', 'public.rsvp_replies', 'select');
