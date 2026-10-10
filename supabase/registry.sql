-- Advika & Sooraj: the registry.
--
-- Run this in the Supabase dashboard's SQL editor AFTER supabase/schema.sql,
-- which it leans on for the rate limiter (`rsvp_hit`). Safe to run again: every
-- statement checks first or replaces, it runs as one transaction, and nothing
-- in it deletes or rewrites a gift.
--
-- Two tables and six functions, and the same two rules as the replies:
--
--   NOTHING HERE CAN BE REACHED WITH THE PROJECT'S PUBLIC KEY.
--
-- Row-level security is on, there are no policies, and EXECUTE on every
-- function is granted to `service_role` alone, the role the *secret* key maps
-- to. A guest's browser never talks to this database; the site's server does,
-- and only to call one of these functions.
--
--   NOTHING IS LOST.
--
-- A gift taken off the page is archived, not deleted, and a claim that is
-- undone or released leaves a line in `registry_log`. A DELETE or TRUNCATE on
-- either table is refused unless whoever is doing it says so first, in the same
-- transaction:
--
--   begin;
--   set local registry.deliberate = 'yes';
--   ...
--   commit;
--
-- The photographs a family uploads live in Supabase Storage, in a public bucket
-- called `registry` made at the foot of this file. It is public for reading
-- only: writing to it takes the secret key, and the bucket refuses anything
-- that is not a small picture.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.registry_gifts (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  -- One short line about it: a colour, a size. Optional.
  note        text        not null default '',
  -- The shop's name as it is set on the card. The site fills it from the link
  -- when the family leaves it blank.
  store       text        not null default '',
  url         text        not null,
  -- A web address, either the shop's own or one in the `registry` bucket.
  image_url   text,
  price_cents integer,
  -- The order the family arranged. New gifts go last.
  position    integer     not null,
  archived_at timestamptz,
  claimed_at  timestamptz,
  -- A hash of a random token that lives in the claiming guest's own browser.
  -- Whoever holds the token can undo the claim; nobody else can, and the token
  -- is never stored here, so this table cannot be used to undo one either.
  claim_hash  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint registry_name_length  check (char_length(name) between 1 and 120),
  constraint registry_note_length  check (char_length(note) <= 160),
  constraint registry_store_length check (char_length(store) <= 60),
  constraint registry_url_shape    check (url ~ '^https?://[^[:space:]]+$' and char_length(url) <= 2000),
  constraint registry_image_shape  check (image_url is null
                                          or (image_url ~ '^https://[^[:space:]]+$' and char_length(image_url) <= 2000)),
  constraint registry_price_range  check (price_cents is null or price_cents between 1 and 10000000),
  constraint registry_claim_pair   check ((claimed_at is null) = (claim_hash is null))
);

create index if not exists registry_gifts_order on public.registry_gifts (archived_at, position);

-- What happened to each gift, in order. Appended to by the functions below,
-- never changed.
create table if not exists public.registry_log (
  id      bigint generated always as identity primary key,
  gift_id uuid        references public.registry_gifts (id) on delete set null,
  event   text        not null,
  at      timestamptz not null default now()
);

alter table public.registry_gifts enable row level security;
alter table public.registry_log   enable row level security;

revoke all on public.registry_gifts, public.registry_log from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

create or replace function public.registry_keep()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('registry.deliberate', true), '') = 'yes' then
    return old;
  end if;
  raise exception 'The registry is kept: this % on % was refused.', tg_op, tg_table_name
    using hint = 'Archive a gift from the family page instead. To remove one on purpose, see supabase/registry.sql.';
end;
$$;

create or replace function public.registry_log_keep()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The one change allowed is the link to a gift that was deliberately removed.
  if new.id = old.id and new.event = old.event and new.at = old.at
     and (new.gift_id is not distinct from old.gift_id or new.gift_id is null)
  then
    return new;
  end if;
  raise exception 'The registry log is kept as it was written: this change was refused.';
end;
$$;

create or replace function public.registry_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists registry_stamp on public.registry_gifts;
create trigger registry_stamp before update on public.registry_gifts
  for each row execute function public.registry_stamp();

drop trigger if exists registry_keep on public.registry_gifts;
create trigger registry_keep before delete on public.registry_gifts
  for each row execute function public.registry_keep();

drop trigger if exists registry_keep_all on public.registry_gifts;
create trigger registry_keep_all before truncate on public.registry_gifts
  for each statement execute function public.registry_keep();

drop trigger if exists registry_keep on public.registry_log;
create trigger registry_keep before delete on public.registry_log
  for each row execute function public.registry_keep();

drop trigger if exists registry_keep_all on public.registry_log;
create trigger registry_keep_all before truncate on public.registry_log
  for each statement execute function public.registry_keep();

drop trigger if exists registry_log_keep on public.registry_log;
create trigger registry_log_keep before update on public.registry_log
  for each row execute function public.registry_log_keep();

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
-- All SECURITY DEFINER with an empty search_path, as the RSVP's are.

-- The registry as a guest sees it: gifts that are on the page, in the family's
-- order, the unclaimed ones first. Nothing here says who claimed or when, and
-- the hash is never sent.
create or replace function public.registry_list()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', g.id, 'name', g.name, 'note', g.note, 'store', g.store,
             'url', g.url, 'image', g.image_url, 'price_cents', g.price_cents,
             'claimed', g.claimed_at is not null)
           order by (g.claimed_at is not null), g.position),
         '[]'::jsonb)
    from public.registry_gifts g
   where g.archived_at is null;
$$;

-- The same, for the family: archived gifts too, and when each was claimed.
create or replace function public.registry_list_all()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'gifts', coalesce(jsonb_agg(
               jsonb_build_object(
                 'id', g.id, 'name', g.name, 'note', g.note, 'store', g.store,
                 'url', g.url, 'image', g.image_url, 'price_cents', g.price_cents,
                 'claimed_at', g.claimed_at, 'archived_at', g.archived_at,
                 'position', g.position)
               order by (g.archived_at is not null), g.position),
             '[]'::jsonb),
    'log', coalesce((
      select jsonb_agg(jsonb_build_object('gift_id', l.gift_id, 'event', l.event, 'at', l.at)
                       order by l.at desc, l.id desc)
        from (select * from public.registry_log order by at desc, id desc limit 60) l),
      '[]'::jsonb)
  )
  from public.registry_gifts g;
$$;

-- A guest says "I'll give this".
--
-- The hash is of a token the guest's browser made; it is what lets that browser,
-- and only that one, take the claim back. A gift that is already claimed, or
-- that has been taken off the page, answers with a code and not an error.
create or replace function public.registry_claim(p_gift uuid, p_hash text, p_caller text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.registry_gifts;
begin
  if p_caller is null or char_length(p_caller) not between 8 and 128
     or p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
  then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if not public.rsvp_hit('rc:' || p_caller, 600, 20) then
    return jsonb_build_object('ok', false, 'code', 'slow_down');
  end if;
  if not public.rsvp_hit('rcd:' || p_caller, 86400, 60) then
    return jsonb_build_object('ok', false, 'code', 'slow_down');
  end if;
  if not public.rsvp_hit('rc-all', 3600, 1500) then
    return jsonb_build_object('ok', false, 'code', 'busy');
  end if;

  update public.registry_gifts
     set claimed_at = now(), claim_hash = p_hash
   where id = p_gift and archived_at is null and claimed_at is null
  returning * into v_row;

  if v_row.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', case when exists (select 1 from public.registry_gifts where id = p_gift and archived_at is null)
                   then 'taken' else 'gone' end);
  end if;

  insert into public.registry_log (gift_id, event) values (p_gift, 'claimed');
  return jsonb_build_object('ok', true);
end;
$$;

-- A guest takes the claim back, from the browser that made it.
create or replace function public.registry_unclaim(p_gift uuid, p_hash text, p_caller text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_caller is null or char_length(p_caller) not between 8 and 128
     or p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
  then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if not public.rsvp_hit('rc:' || p_caller, 600, 20) then
    return jsonb_build_object('ok', false, 'code', 'slow_down');
  end if;

  update public.registry_gifts
     set claimed_at = null, claim_hash = null
   where id = p_gift and claim_hash = p_hash
  returning id into v_id;

  if v_id is null then
    -- The same answer whether the gift is not there, was never claimed, or was
    -- claimed by someone else: it must not tell a stranger which.
    return jsonb_build_object('ok', false, 'code', 'refused');
  end if;

  insert into public.registry_log (gift_id, event) values (p_gift, 'taken back by the guest');
  return jsonb_build_object('ok', true);
end;
$$;

-- The family adds a gift or changes one. An `id` in the body means change.
create or replace function public.registry_save(p_gift jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_name  text := btrim(coalesce(p_gift ->> 'name', ''));
  v_note  text := btrim(coalesce(p_gift ->> 'note', ''));
  v_store text := btrim(coalesce(p_gift ->> 'store', ''));
  v_url   text := btrim(coalesce(p_gift ->> 'url', ''));
  v_image text := nullif(btrim(coalesce(p_gift ->> 'image', '')), '');
  v_price integer;
  v_pos   integer;
begin
  begin
    v_id    := nullif(p_gift ->> 'id', '')::uuid;
    v_price := nullif(p_gift ->> 'price_cents', '')::integer;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end;

  if char_length(v_name) not between 1 and 120 or char_length(v_note) > 160
     or char_length(v_store) > 60
     or v_url !~ '^https?://[^[:space:]]+$' or char_length(v_url) > 2000
     or (v_image is not null and (v_image !~ '^https://[^[:space:]]+$' or char_length(v_image) > 2000))
     or (v_price is not null and v_price not between 1 and 10000000)
  then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  if v_id is null then
    if (select count(*) from public.registry_gifts) >= 500 then
      return jsonb_build_object('ok', false, 'code', 'full');
    end if;
    select coalesce(max(position), 0) + 1 into v_pos from public.registry_gifts;
    insert into public.registry_gifts (name, note, store, url, image_url, price_cents, position)
    values (v_name, v_note, v_store, v_url, v_image, v_price, v_pos)
    returning id into v_id;
    insert into public.registry_log (gift_id, event) values (v_id, 'added');
  else
    update public.registry_gifts
       set name = v_name, note = v_note, store = v_store, url = v_url,
           image_url = v_image, price_cents = v_price
     where id = v_id;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'gone');
    end if;
    insert into public.registry_log (gift_id, event) values (v_id, 'edited');
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- Move a gift, archive it, bring it back, or let go of a claim.
create or replace function public.registry_act(p_gift uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_g     public.registry_gifts;
  v_other public.registry_gifts;
begin
  select * into v_g from public.registry_gifts where id = p_gift for update;
  if v_g.id is null then
    return jsonb_build_object('ok', false, 'code', 'gone');
  end if;

  if p_action in ('up', 'down') then
    if v_g.archived_at is not null then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end if;
    if p_action = 'up' then
      select * into v_other from public.registry_gifts
       where archived_at is null and position < v_g.position
       order by position desc limit 1 for update;
    else
      select * into v_other from public.registry_gifts
       where archived_at is null and position > v_g.position
       order by position asc limit 1 for update;
    end if;
    if v_other.id is not null then
      update public.registry_gifts set position = v_other.position where id = v_g.id;
      update public.registry_gifts set position = v_g.position     where id = v_other.id;
    end if;
    return jsonb_build_object('ok', true);

  elsif p_action = 'archive' then
    update public.registry_gifts set archived_at = now() where id = p_gift and archived_at is null;
    if found then
      insert into public.registry_log (gift_id, event) values (p_gift, 'archived');
    end if;

  elsif p_action = 'restore' then
    update public.registry_gifts
       set archived_at = null,
           position = (select coalesce(max(position), 0) + 1 from public.registry_gifts)
     where id = p_gift and archived_at is not null;
    if found then
      insert into public.registry_log (gift_id, event) values (p_gift, 'restored');
    end if;

  elsif p_action = 'release' then
    update public.registry_gifts set claimed_at = null, claim_hash = null
     where id = p_gift and claimed_at is not null;
    if found then
      insert into public.registry_log (gift_id, event) values (p_gift, 'released by the family');
    end if;

  else
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Whether the guards above are all in place and on.
create or replace function public.registry_guarded()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select count(*) = 5
    from pg_catalog.pg_trigger t
   where t.tgrelid in ('public.registry_gifts'::regclass, 'public.registry_log'::regclass)
     and t.tgname in ('registry_keep', 'registry_keep_all', 'registry_log_keep')
     and t.tgenabled <> 'D';
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------

revoke all on function public.registry_list()                          from public, anon, authenticated;
revoke all on function public.registry_list_all()                      from public, anon, authenticated;
revoke all on function public.registry_claim(uuid, text, text)         from public, anon, authenticated;
revoke all on function public.registry_unclaim(uuid, text, text)       from public, anon, authenticated;
revoke all on function public.registry_save(jsonb)                     from public, anon, authenticated;
revoke all on function public.registry_act(uuid, text)                 from public, anon, authenticated;
revoke all on function public.registry_guarded()                       from public, anon, authenticated, service_role;
revoke all on function public.registry_keep()                          from public, anon, authenticated, service_role;
revoke all on function public.registry_log_keep()                      from public, anon, authenticated, service_role;
revoke all on function public.registry_stamp()                         from public, anon, authenticated, service_role;

grant execute on function public.registry_list()                    to service_role;
grant execute on function public.registry_list_all()                to service_role;
grant execute on function public.registry_claim(uuid, text, text)   to service_role;
grant execute on function public.registry_unclaim(uuid, text, text) to service_role;
grant execute on function public.registry_save(jsonb)               to service_role;
grant execute on function public.registry_act(uuid, text)           to service_role;

commit;

-- ---------------------------------------------------------------------------
-- The photographs
-- ---------------------------------------------------------------------------
-- A bucket for the pictures the family uploads, public for reading so that a
-- guest's browser can show them, and limited at the bucket to 1.5 MB of JPEG,
-- PNG or WebP so that nothing else can be stored in it even with the secret
-- key. Nothing can be written with the public key: Storage's own policies
-- start closed and none is added here.
--
-- This part is Supabase's alone. On a bare Postgres, which is what
-- tools/rsvp/local.sh runs, there is no `storage` schema, and it is skipped.

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('registry', 'registry', true, 1572864, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update
      set public = true, file_size_limit = 1572864,
          allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
  end if;
end
$$;

-- To check it took, run this. Every column should say `false` except the last,
-- which should say `true`.
--
--   select has_function_privilege('anon', 'public.registry_list()', 'execute')                        as anon_can_list,
--          has_function_privilege('anon', 'public.registry_claim(uuid, text, text)', 'execute')        as anon_can_claim,
--          has_function_privilege('authenticated', 'public.registry_save(jsonb)', 'execute')           as signed_in_can_save,
--          has_table_privilege('anon', 'public.registry_gifts', 'select')                              as anon_can_read,
--          public.registry_guarded()                                                                   as safeguards_on;
