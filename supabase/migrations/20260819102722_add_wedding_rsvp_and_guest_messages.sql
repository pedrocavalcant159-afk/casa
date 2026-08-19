create table public.guest_responses (
  id bigint generated always as identity primary key,
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 120),
  attending boolean not null,
  guest_count smallint not null default 1 check (guest_count between 1 and 12),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

alter table public.guest_responses enable row level security;

revoke all on table public.guest_responses from anon, authenticated;
grant insert on table public.guest_responses to anon;
grant select, delete on table public.guest_responses to authenticated;
grant usage, select on sequence public.guest_responses_id_seq to anon, authenticated;

create policy "guests_can_submit_rsvp"
on public.guest_responses
for insert
to anon
with check (true);

create policy "site_admins_can_read_rsvp"
on public.guest_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.site_admins
    where site_admins.user_id = (select auth.uid())
  )
);

create policy "site_admins_can_delete_rsvp"
on public.guest_responses
for delete
to authenticated
using (
  exists (
    select 1
    from public.site_admins
    where site_admins.user_id = (select auth.uid())
  )
);

create index guest_responses_created_at_idx
on public.guest_responses (created_at desc);

create table public.guest_messages (
  id bigint generated always as identity primary key,
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 120),
  message text not null check (char_length(btrim(message)) between 2 and 1200),
  created_at timestamptz not null default now()
);

alter table public.guest_messages enable row level security;

revoke all on table public.guest_messages from anon, authenticated;
grant insert on table public.guest_messages to anon;
grant select, delete on table public.guest_messages to authenticated;
grant usage, select on sequence public.guest_messages_id_seq to anon, authenticated;

create policy "guests_can_send_messages"
on public.guest_messages
for insert
to anon
with check (true);

create policy "site_admins_can_read_messages"
on public.guest_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.site_admins
    where site_admins.user_id = (select auth.uid())
  )
);

create policy "site_admins_can_delete_messages"
on public.guest_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.site_admins
    where site_admins.user_id = (select auth.uid())
  )
);

create index guest_messages_created_at_idx
on public.guest_messages (created_at desc);
