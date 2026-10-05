-- Advika & Sooraj: where the replies are kept.
--
-- Run this in the Supabase dashboard's SQL editor: once on a new project, and
-- again whenever this file changes. It is safe to run again on a project that
-- already has replies: every statement either checks first or replaces, it
-- runs as one transaction, and nothing in it deletes or rewrites a reply.
-- README.md § The RSVP has the steps around it.
--
-- Three tables, seven functions and four guards, and two rules that explain
-- all of it:
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
--
--   NOTHING A GUEST SENDS IS EVER LOST.
--
-- Every version of every reply is written to `rsvp_history` as it arrives, by
-- a trigger, so a change made by hand in the table editor is recorded too. A
-- reply, or any version of one, cannot be deleted or truncated, and a version
-- cannot be rewritten, unless whoever is doing it says so first in the same
-- transaction (§ Guards). Added in October 2026, before the link went out.

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
  -- The reply this is a version of. Empty only if that reply was deliberately
  -- removed; its versions stay.
  reply_id    uuid        references public.rsvp_replies (id) on delete set null,
  revision    integer     not null,
  received_at timestamptz not null default now(),
  reply       jsonb       not null,
  -- 'card' when it came from the reply card; 'by hand' when somebody changed
  -- the reply in the database directly, in the table editor or the SQL editor.
  source      text        not null default 'card',
  -- A keyed hash of the sender's address. It tells one sender from another; it
  -- cannot be turned back into an address, and it is erased after two days
  -- (rsvp_sweep). See lib/rsvp/server.ts.
  via         text        not null default ''
);

-- A table made before October 2026, brought up to the definition above. Each
-- statement is safe to run again, and none adds to or takes from a reply.
-- The link to the reply was ON DELETE CASCADE, so deleting one reply from the
-- table editor would have deleted every version of it as well.
alter table public.rsvp_history add column if not exists source text not null default 'card';
alter table public.rsvp_history alter column reply_id drop not null;
alter table public.rsvp_history drop constraint if exists rsvp_history_reply_id_fkey;
alter table public.rsvp_history add constraint rsvp_history_reply_id_fkey
  foreign key (reply_id) references public.rsvp_replies (id) on delete set null;

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

  -- Who sent it, for the trigger that writes this version to the history
  -- (rsvp_record). For this transaction only.
  perform set_config('rsvp.via', p_caller, true);

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
    updated_at = now();

  perform public.rsvp_sweep();

  -- Deliberately the same answer for a first reply and for a replacement. If
  -- it said which, the form could be used to find out whether a phone number
  -- had already replied.
  return jsonb_build_object('ok', true);
end;
$$;

-- Whether the guards below are all in place and switched on. The family's page
-- says so when they are not, because a project set up before October 2026
-- has none until this file is run again.
create or replace function public.rsvp_guarded()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select count(*) = 7
    from pg_catalog.pg_trigger t
   where t.tgrelid in ('public.rsvp_replies'::regclass, 'public.rsvp_history'::regclass)
     and t.tgname in ('rsvp_touch', 'rsvp_record', 'rsvp_keep', 'rsvp_keep_all', 'rsvp_history_keep')
     and t.tgenabled <> 'D';
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
        from public.rsvp_replies),
    'guarded', public.rsvp_guarded()
  );
$$;

-- Every version of every reply, oldest first, for the family's second
-- spreadsheet. Not the sender's hash: that tells senders apart while it is
-- fresh, and means nothing in a spreadsheet.
create or replace function public.rsvp_history_list()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
        'reply_id',    h.reply_id,
        'revision',    h.revision,
        'received_at', h.received_at,
        'source',      h.source,
        'latest',      h.reply_id is not null and h.revision = r.revision,
        'reply',       h.reply)
      order by h.received_at, h.id),
    '[]'::jsonb)
    from public.rsvp_history h
    left join public.rsvp_replies r on r.id = h.reply_id;
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
  return jsonb_build_object(
    'ok', true,
    'replies', (select count(*) from public.rsvp_replies),
    'guarded', public.rsvp_guarded());
end;
$$;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
-- A reply, and every version of one, is kept. These refuse a DELETE or a
-- TRUNCATE on either table, and any change to a version once it is written,
-- from wherever it comes: the table editor, the SQL editor, a stray statement.
-- Nothing the site does deletes a reply, so the site never meets them.
--
-- Removing something on purpose — the test replies, before the link goes out —
-- is still possible, by saying so first, in the same transaction:
--
--   begin;
--   set local rsvp.deliberate = 'yes';
--   ...
--   commit;
--
-- README.md § The RSVP, step 5, has the whole statement. A reply removed that
-- way still leaves its versions in rsvp_history.

create or replace function public.rsvp_keep()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('rsvp.deliberate', true), '') = 'yes' then
    return old;  -- a TRUNCATE's trigger is per statement, and its value unused
  end if;
  raise exception 'Replies are kept: this % on % was refused.', tg_op, tg_table_name
    using hint = 'To remove a test reply on purpose, see README.md, The RSVP, step 5.';
end;
$$;

create or replace function public.rsvp_history_keep()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Two changes are allowed, and only the database makes them: the sender's
  -- hash blanked after two days (rsvp_sweep), and the link to a reply that
  -- was deliberately removed (on delete set null). What a guest said, and
  -- when, is never rewritten.
  if new.id = old.id
     and new.revision = old.revision
     and new.received_at = old.received_at
     and new.reply = old.reply
     and new.source = old.source
     and (new.via = old.via or new.via = '')
     and (new.reply_id is not distinct from old.reply_id or new.reply_id is null)
  then
    return new;
  end if;
  if coalesce(current_setting('rsvp.deliberate', true), '') = 'yes' then
    return new;
  end if;
  raise exception 'A version of a reply is kept as it arrived: this change was refused.'
    using hint = 'See README.md, The RSVP, step 5.';
end;
$$;

-- Every version of a reply goes into rsvp_history as it is written, whichever
-- way it was written. rsvp_submit says who sent it; anything else is a change
-- made by hand, and is recorded as one.
create or replace function public.rsvp_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via text := coalesce(current_setting('rsvp.via', true), '');
begin
  insert into public.rsvp_history (reply_id, revision, reply, source, via)
  values (
    new.id,
    new.revision,
    jsonb_build_object(
      'name', new.name, 'contact', new.contact,
      'muhurtham', new.muhurtham, 'reception', new.reception,
      'party', to_jsonb(new.party), 'dietary', new.dietary, 'note', new.note),
    case when v_via = '' then 'by hand' else 'card' end,
    v_via);
  return null;
end;
$$;

-- A change made by hand counts as a change: a new revision, and the time.
create or replace function public.rsvp_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('rsvp.via', true), '') = '' then
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists rsvp_touch on public.rsvp_replies;
create trigger rsvp_touch before update on public.rsvp_replies
  for each row execute function public.rsvp_touch();

drop trigger if exists rsvp_record on public.rsvp_replies;
create trigger rsvp_record after insert or update on public.rsvp_replies
  for each row execute function public.rsvp_record();

drop trigger if exists rsvp_keep on public.rsvp_replies;
create trigger rsvp_keep before delete on public.rsvp_replies
  for each row execute function public.rsvp_keep();

drop trigger if exists rsvp_keep_all on public.rsvp_replies;
create trigger rsvp_keep_all before truncate on public.rsvp_replies
  for each statement execute function public.rsvp_keep();

drop trigger if exists rsvp_keep on public.rsvp_history;
create trigger rsvp_keep before delete on public.rsvp_history
  for each row execute function public.rsvp_keep();

drop trigger if exists rsvp_keep_all on public.rsvp_history;
create trigger rsvp_keep_all before truncate on public.rsvp_history
  for each statement execute function public.rsvp_keep();

drop trigger if exists rsvp_history_keep on public.rsvp_history;
create trigger rsvp_history_keep before update on public.rsvp_history
  for each row execute function public.rsvp_history_keep();

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
-- Postgres gives EXECUTE on a new function to everybody, and Supabase's API
-- roles inherit that. Take it back from all of them and give it to one.
revoke all on function public.rsvp_hit(text, integer, integer) from public, anon, authenticated, service_role;
revoke all on function public.rsvp_submit(jsonb, text)         from public, anon, authenticated;
revoke all on function public.rsvp_list()                      from public, anon, authenticated;
revoke all on function public.rsvp_history_list()              from public, anon, authenticated;
revoke all on function public.rsvp_gate(text)                  from public, anon, authenticated;
revoke all on function public.rsvp_ping()                      from public, anon, authenticated;
revoke all on function public.rsvp_sweep()                     from public, anon, authenticated, service_role;
revoke all on function public.rsvp_guarded()                   from public, anon, authenticated, service_role;
revoke all on function public.rsvp_keep()                      from public, anon, authenticated, service_role;
revoke all on function public.rsvp_history_keep()              from public, anon, authenticated, service_role;
revoke all on function public.rsvp_record()                    from public, anon, authenticated, service_role;
revoke all on function public.rsvp_touch()                     from public, anon, authenticated, service_role;

grant execute on function public.rsvp_submit(jsonb, text) to service_role;
grant execute on function public.rsvp_list()              to service_role;
grant execute on function public.rsvp_history_list()      to service_role;
grant execute on function public.rsvp_gate(text)          to service_role;
grant execute on function public.rsvp_ping()              to service_role;
-- The rest are granted to nobody: only the functions above and the triggers
-- call them.

commit;

-- To check it took, run this. Every column should say `false` except the last,
-- which should say `true`. Each is named, because Supabase's results grid shows
-- one column per name: unnamed, the three `has_function_privilege` columns
-- arrive as one.
--
--   select has_function_privilege('anon', 'public.rsvp_submit(jsonb, text)', 'execute') as anon_can_submit,
--          has_function_privilege('anon', 'public.rsvp_list()', 'execute')              as anon_can_list,
--          has_function_privilege('anon', 'public.rsvp_history_list()', 'execute')      as anon_can_list_versions,
--          has_function_privilege('authenticated', 'public.rsvp_list()', 'execute')     as signed_in_can_list,
--          has_table_privilege('anon', 'public.rsvp_replies', 'select')                 as anon_can_read,
--          public.rsvp_guarded()                                                        as safeguards_on;
