-- =============================================================================
-- Correção: excluir um grupo que já recebeu votos.
--
-- Sintoma: ao excluir o grupo, o Postgres tenta apagar os candidatos (cascade
-- de groups -> candidates) e falha porque public.votes.candidate_id referencia
-- esses candidatos sem ON DELETE CASCADE.
--
-- Solução: recriar a chave estrangeira com ON DELETE CASCADE. Assim, apagar o
-- grupo remove candidatos, seções e votos em uma única operação consistente.
--
-- Execute no SQL Editor do Supabase (New query > Run). Idempotente.
-- =============================================================================

alter table public.votes
  drop constraint if exists votes_candidate_id_fkey;

alter table public.votes
  add constraint votes_candidate_id_fkey
  foreign key (candidate_id) references public.candidates(id) on delete cascade;
