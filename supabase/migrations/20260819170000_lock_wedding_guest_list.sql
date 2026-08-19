create table public.wedding_guests (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  search_name text generated always as (
    lower(
      translate(
        regexp_replace(btrim(display_name), '\s+', ' ', 'g'),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
      )
    )
  ) stored,
  max_guests smallint not null default 1 check (max_guests between 1 and 12),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (search_name)
);

alter table public.wedding_guests enable row level security;

revoke all on table public.wedding_guests from anon, authenticated;
grant select, insert, update, delete on table public.wedding_guests to authenticated;

create policy "site_admins_can_read_wedding_guests"
on public.wedding_guests for select to authenticated
using (exists (select 1 from public.site_admins where site_admins.user_id = (select auth.uid())));

create policy "site_admins_can_insert_wedding_guests"
on public.wedding_guests for insert to authenticated
with check (exists (select 1 from public.site_admins where site_admins.user_id = (select auth.uid())));

create policy "site_admins_can_update_wedding_guests"
on public.wedding_guests for update to authenticated
using (exists (select 1 from public.site_admins where site_admins.user_id = (select auth.uid())))
with check (exists (select 1 from public.site_admins where site_admins.user_id = (select auth.uid())));

create policy "site_admins_can_delete_wedding_guests"
on public.wedding_guests for delete to authenticated
using (exists (select 1 from public.site_admins where site_admins.user_id = (select auth.uid())));

alter table public.guest_responses
  add column guest_id uuid references public.wedding_guests(id) on delete restrict,
  add column updated_at timestamptz not null default now();

alter table public.guest_responses
  alter column guest_id set not null,
  add constraint guest_responses_guest_id_key unique (guest_id);

drop policy if exists "guests_can_submit_rsvp" on public.guest_responses;
revoke insert on table public.guest_responses from anon;
revoke usage, select on sequence public.guest_responses_id_seq from anon;

create or replace function public.search_wedding_guests(search_term text)
returns table (guest_id uuid, guest_name text, max_guests smallint)
language sql stable security definer set search_path = ''
as $$
  with normalized as (
    select lower(translate(
      regexp_replace(btrim(coalesce(search_term, '')), '\s+', ' ', 'g'),
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
      'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
    )) as value
  )
  select guest.id, guest.display_name, guest.max_guests
  from public.wedding_guests as guest
  cross join normalized
  where guest.active
    and char_length(normalized.value) >= 3
    and position(normalized.value in guest.search_name) > 0
  order by case when guest.search_name like normalized.value || '%' then 0 else 1 end,
    guest.display_name
  limit 8;
$$;

create or replace function public.submit_wedding_rsvp(
  p_guest_id uuid,
  p_attending boolean,
  p_guest_count smallint,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  invited_guest public.wedding_guests%rowtype;
  clean_note text;
begin
  select * into invited_guest
  from public.wedding_guests
  where id = p_guest_id and active
  for update;

  if not found then
    raise exception using message = 'Selecione um nome válido da lista de convidados.';
  end if;

  if p_attending is null then
    raise exception using message = 'Informe se você estará presente.';
  end if;

  if p_guest_count is null or p_guest_count < 1 or p_guest_count > invited_guest.max_guests then
    raise exception using message = format('Este convite permite confirmar até %s pessoa(s).', invited_guest.max_guests);
  end if;

  clean_note := nullif(btrim(coalesce(p_note, '')), '');
  if clean_note is not null and char_length(clean_note) > 500 then
    raise exception using message = 'A observação deve ter no máximo 500 caracteres.';
  end if;

  insert into public.guest_responses (guest_id, guest_name, attending, guest_count, note, updated_at)
  values (invited_guest.id, invited_guest.display_name, p_attending, p_guest_count, clean_note, now())
  on conflict (guest_id) do update set
    guest_name = excluded.guest_name,
    attending = excluded.attending,
    guest_count = excluded.guest_count,
    note = excluded.note,
    updated_at = now();

  return jsonb_build_object('ok', true, 'guest_name', invited_guest.display_name, 'max_guests', invited_guest.max_guests);
end;
$$;

revoke execute on function public.search_wedding_guests(text) from public, authenticated;
revoke execute on function public.submit_wedding_rsvp(uuid, boolean, smallint, text) from public, authenticated;
grant execute on function public.search_wedding_guests(text) to anon;
grant execute on function public.submit_wedding_rsvp(uuid, boolean, smallint, text) to anon;

create index wedding_guests_search_name_idx on public.wedding_guests (search_name);
create index guest_responses_guest_id_idx on public.guest_responses (guest_id);
