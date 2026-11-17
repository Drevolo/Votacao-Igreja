-- =============================================================================
-- Correção: permitir que o eleitor abra o link de votação mesmo estando logado
-- como administrador no mesmo navegador.
--
-- Sintoma: "Não foi possível carregar a votação. Verifique sua conexão."
-- Causa: get_voting_group e cast_vote tinham EXECUTE apenas para o papel anon.
--        Com uma sessão de admin ativa, o PostgREST usa o papel authenticated,
--        que não tinha permissão e retornava "permission denied".
--
-- Execute este arquivo no SQL Editor do Supabase (New query > Run).
-- É seguro rodar quantas vezes quiser.
-- =============================================================================

revoke all on function public.cast_vote(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, text) to anon, authenticated;

revoke all on function public.get_voting_group(text) from public, anon, authenticated;
grant execute on function public.get_voting_group(text) to anon, authenticated;

-- A apuração continua restrita somente ao administrador autenticado.
revoke all on function public.get_group_results(uuid) from public, anon, authenticated;
grant execute on function public.get_group_results(uuid) to authenticated;
