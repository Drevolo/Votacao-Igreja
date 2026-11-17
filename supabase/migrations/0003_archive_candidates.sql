-- =============================================================================
-- Exclusão lógica de candidatos/opções de voto.
--
-- Problema: excluir uma linha de public.candidates que já recebeu votos viola
-- a chave estrangeira votes_candidate_id_fkey. Apagar os votos destruiria a
-- apuração das seções anteriores.
--
-- Solução: marcar o candidato como arquivado. Ele desaparece da cédula e do
-- painel, mas continua no banco para que os resultados históricos permaneçam.
--
-- Execute no SQL Editor do Supabase (New query > Run). Idempotente.
-- =============================================================================

alter table public.candidates
  add column if not exists archived boolean not null default false;

-- A cédula pública não mostra opções arquivadas.
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

-- CREATE OR REPLACE preserva as permissões existentes, mas garantimos aqui.
revoke all on function public.get_voting_group(text) from public, anon, authenticated;
grant execute on function public.get_voting_group(text) to anon, authenticated;
