-- =============================================================================
-- Votação da Igreja — schema inicial
-- Execute este arquivo completo no SQL Editor do Supabase (New query > Run).
-- =============================================================================

-- pgcrypto fornece hmac(). No Supabase ela costuma já existir no schema
-- "extensions"; mantemos os dois schemas no search_path das funções abaixo.
create extension if not exists pgcrypto with schema public;

-- -----------------------------------------------------------------------------
-- Segredo usado para transformar o e-mail em hash. Nenhuma policy e nenhum
-- grant dá acesso a este schema para anon/authenticated.
-- -----------------------------------------------------------------------------
create schema if not exists private;

create table if not exists private.app_config (
  key text primary key,
  value text not null
);

insert into private.app_config (key, value)
values ('vote_hmac_secret', md5(gen_random_uuid()::text || clock_timestamp()::text))
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  -- Exclusão lógica: o nome sai da cédula, mas os votos históricos são preservados.
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cada abertura feita pelo ADM é uma "seção" (escrutínio).
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  number integer not null check (number > 0),
  is_open boolean not null default false,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, number)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id),
  -- HMAC do e-mail normalizado. O e-mail original nunca é gravado.
  voter_hash text not null,
  created_at timestamptz not null default now(),
  -- Um e-mail (hash) só pode votar uma vez por seção.
  unique (round_id, voter_hash)
);

create index if not exists groups_election_id_idx on public.groups (election_id);
create index if not exists candidates_group_id_idx on public.candidates (group_id);
create index if not exists rounds_group_id_idx on public.rounds (group_id);
create index if not exists votes_round_id_idx on public.votes (round_id);
create index if not exists votes_hash_created_idx on public.votes (voter_hash, created_at);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.elections enable row level security;
alter table public.groups enable row level security;
alter table public.candidates enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;

-- votes fica sem policy: somente as funções SECURITY DEFINER conseguem ler/escrever.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "elections_owner_all" on public.elections;
create policy "elections_owner_all" on public.elections
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "groups_owner_all" on public.groups;
create policy "groups_owner_all" on public.groups
  for all to authenticated
  using (
    exists (
      select 1 from public.elections e
      where e.id = election_id and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.elections e
      where e.id = election_id and e.owner_id = auth.uid()
    )
  );

drop policy if exists "candidates_owner_all" on public.candidates;
create policy "candidates_owner_all" on public.candidates
  for all to authenticated
  using (
    exists (
      select 1 from public.groups g
      join public.elections e on e.id = g.election_id
      where g.id = group_id and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      join public.elections e on e.id = g.election_id
      where g.id = group_id and e.owner_id = auth.uid()
    )
  );

drop policy if exists "rounds_owner_all" on public.rounds;
create policy "rounds_owner_all" on public.rounds
  for all to authenticated
  using (
    exists (
      select 1 from public.groups g
      join public.elections e on e.id = g.election_id
      where g.id = group_id and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      join public.elections e on e.id = g.election_id
      where g.id = group_id and e.owner_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Criação automática do perfil quando o ADM é cadastrado no Auth
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Leitura pública da cédula (sem votos e sem e-mails)
-- -----------------------------------------------------------------------------
create or replace function public.get_voting_group(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'group', jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'election_title', e.title
    ),
    'open', exists (
      select 1 from public.rounds r
      where r.group_id = g.id and r.is_open = true
    ),
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.created_at)
      from public.candidates c
      where c.group_id = g.id and c.archived = false
    ), '[]'::jsonb)
  )
  from public.groups g
  join public.elections e on e.id = g.election_id
  where g.slug = lower(btrim(p_slug));
$$;

-- -----------------------------------------------------------------------------
-- Registro do voto (única forma de gravar em public.votes)
-- -----------------------------------------------------------------------------
create or replace function public.cast_vote(
  p_group_id uuid,
  p_candidate_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_round public.rounds%rowtype;
  v_secret text;
  v_hash text;
begin
  if p_group_id is null or p_candidate_id is null or p_email is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select * into v_round
  from public.rounds
  where group_id = p_group_id and is_open = true
  order by number desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  if not exists (
    select 1 from public.candidates
    where id = p_candidate_id and group_id = p_group_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_candidate');
  end if;

  if position('@' in p_email) = 0 or length(btrim(p_email)) < 6 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select value into v_secret from private.app_config where key = 'vote_hmac_secret';
  if v_secret is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  v_hash := encode(hmac(lower(btrim(p_email)), v_secret, 'sha256'), 'hex');

  if exists (
    select 1 from public.votes
    where round_id = v_round.id and voter_hash = v_hash
  ) then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;

  begin
    insert into public.votes (round_id, candidate_id, voter_hash)
    values (v_round.id, p_candidate_id, v_hash);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end;

  return jsonb_build_object('ok', true, 'round', v_round.number);
end;
$$;

-- -----------------------------------------------------------------------------
-- Apuração (somente o dono da votação, inclusive seções encerradas)
-- -----------------------------------------------------------------------------
create or replace function public.get_group_results(p_group_id uuid)
returns table (
  round_id uuid,
  round_number integer,
  is_open boolean,
  candidate_id uuid,
  candidate_name text,
  votes bigint
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.number, r.is_open, c.id, c.name, count(v.id)
  from public.rounds r
  join public.candidates c on c.group_id = r.group_id
  left join public.votes v on v.round_id = r.id and v.candidate_id = c.id
  where r.group_id = p_group_id
    and exists (
      select 1 from public.groups g
      join public.elections e on e.id = g.election_id
      where g.id = p_group_id and e.owner_id = auth.uid()
    )
  group by r.id, r.number, r.is_open, c.id, c.name
  order by r.number desc, c.name asc;
$$;

-- -----------------------------------------------------------------------------
-- Permissões de execução
-- -----------------------------------------------------------------------------
-- As funções públicas de votação precisam funcionar tanto para visitantes
-- anônimos quanto para o ADM logado (que pode abrir o link no mesmo navegador).
revoke all on function public.cast_vote(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, text) to anon, authenticated;

revoke all on function public.get_voting_group(text) from public, anon, authenticated;
grant execute on function public.get_voting_group(text) to anon, authenticated;

revoke all on function public.get_group_results(uuid) from public, anon, authenticated;
grant execute on function public.get_group_results(uuid) to authenticated;
