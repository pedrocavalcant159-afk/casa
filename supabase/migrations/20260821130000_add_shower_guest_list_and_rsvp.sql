create table public.shower_guest_responses (
  id bigint generated always as identity primary key,
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 120),
  search_name text generated always as (
    lower(
      translate(
        regexp_replace(btrim(guest_name), '\s+', ' ', 'g'),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
      )
    )
  ) stored,
  attending boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (search_name)
);

alter table public.shower_guest_responses enable row level security;

revoke all on table public.shower_guest_responses from anon, authenticated;
revoke all on sequence public.shower_guest_responses_id_seq from anon, authenticated;

grant select, delete on table public.shower_guest_responses to authenticated;
grant usage, select on sequence public.shower_guest_responses_id_seq to authenticated;

create policy "site_admins_can_read_shower_rsvp"
on public.shower_guest_responses for select to authenticated
using (exists (select 1 from public.site_admins where site_admins.user_id = (select auth.uid())));

create policy "site_admins_can_delete_shower_rsvp"
on public.shower_guest_responses for delete to authenticated
using (exists (select 1 from public.site_admins where site_admins.user_id = (select auth.uid())));

create or replace function public.submit_shower_rsvp(
  p_guest_name text,
  p_attending boolean
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  clean_name text;
begin
  clean_name := regexp_replace(btrim(coalesce(p_guest_name, '')), '\s+', ' ', 'g');

  if char_length(clean_name) < 2 or char_length(clean_name) > 120 then
    raise exception using message = 'Informe seu nome e sobrenome.';
  end if;

  if p_attending is null then
    raise exception using message = 'Informe se você estará presente.';
  end if;

  insert into public.shower_guest_responses (guest_name, attending, updated_at)
  values (clean_name, p_attending, now())
  on conflict (search_name) do update set
    guest_name = excluded.guest_name,
    attending = excluded.attending,
    updated_at = now();

  return jsonb_build_object('ok', true, 'guest_name', clean_name);
end;
$$;

revoke execute on function public.submit_shower_rsvp(text, boolean) from public, authenticated;
grant execute on function public.submit_shower_rsvp(text, boolean) to anon;

create index shower_guest_responses_created_at_idx on public.shower_guest_responses (created_at desc);
