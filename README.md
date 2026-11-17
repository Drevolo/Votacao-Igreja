# Votação da Igreja

Sistema de votação com duas áreas:

- **Área do eleitor** — acessada por link personalizado ou QR Code. Sem login: o eleitor informa apenas o e-mail, escolhe uma opção pelo nome e confirma.
- **Área administrativa** — login do ADM para criar votações independentes, grupos (SAF, UMP...), opções, gerar links/QR Codes, liberar ou bloquear o voto por grupo, zerar e reabrir escrutínios e acompanhar os resultados.

O e-mail é convertido em **HMAC** no banco e nunca é armazenado em texto puro. Os resultados ficam visíveis somente no painel administrativo.

---

## 1. Preparar o Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com/).
2. No **SQL Editor**, clique em *New query*, cole todo o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e clique em **Run**.
3. Em **Authentication → Users**, clique em **Add user → Create new user**:
   - informe o e-mail e a senha do administrador;
   - marque **Auto Confirm User**;
   - salve.
   - Não existe cadastro público: somente usuários criados aqui conseguem entrar no painel.
4. Em **Project Settings → API**, copie:
   - **Project URL** (ex.: `https://abcdefgh.supabase.co`) → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

> ⚠️ **Atenção às novas chaves da API do Supabase:** no front-end use somente a **anon/public key** (JWT começando com `eyJ...`) ou a **publishable key** (`sb_publishable_...`). **Nunca** use a **secret key** (`sb_secret_...`) — ela dá acesso administrativo e vazaria no JavaScript público. Se isso acontecer, revogue a chave em **Project Settings → API → Secret keys**.
>
> A chave anônima é pública por design. A proteção vem das policies RLS e das funções `SECURITY DEFINER` criadas na migration.

---

## 2. Rodar localmente

```bash
cp .env.example .env.local
# edite .env.local com a URL e a chave do Supabase

npm install
npm run dev
```

Abra `http://localhost:5173`. Para testar o voto, use `/admin` para montar a votação e depois `/v/<codigo-do-grupo>`.

---

## 3. Publicar no GitHub Pages

1. Crie o repositório no GitHub (o nome dele vira a base do site, ex.: `Votacao-Igreja`).
2. Em **Settings → Secrets and variables → Actions**, adicione os *repository secrets*:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
4. Faça push para a branch `main`. O workflow em `.github/workflows/deploy.yml` gera o build e publica.

O `VITE_BASE_PATH` é preenchido automaticamente pelo workflow com `/<nome-do-repositorio>/`. O arquivo `public/404.html` garante que links como `/v/saf` funcionem mesmo o Pages sendo estático.

> O projeto Supabase gratuito é pausado após 1 semana sem uso. Antes de um evento de votação, abra o painel do Supabase uma vez para garantir que ele está ativo.

---

## 4. Como usar

### No painel (`/admin`)

1. **Nova votação** — informe o título (ex.: "Eleição da Diretoria 2026"). Ela nasce sem grupos.
2. **Adicionar grupo** — informe o nome (SAF, UMP...) e o código do link (`saf`, `ump`). O código é gerado automaticamente a partir do nome.
3. **Opções de voto** — clique em *Editar nomes* do grupo e cadastre somente os nomes das opções. Não há fotos.
4. **Copiar link / QR Code** — o QR é gerado a partir do link e pode ser baixado em PNG.
5. **Liberar voto** — abre a seção 1. Cada e-mail pode votar uma vez nela.
6. **Bloquear voto** — pausa ou encerra a seção. Se você liberar de novo, é a **mesma** seção: quem já votou continua bloqueado.
7. **Zerar e abrir nova seção** — encerra a seção atual, cria o próximo escrutínio (2º, 3º...) com a contagem zerada e libera todos os e-mails para votar novamente. As seções anteriores ficam arquivadas no painel.
8. **Ver resultados** — apuração por seção, visível somente para o ADM.

### Na aba do eleitor (`/v/<codigo>`)

1. Se a seção estiver bloqueada, aparece um aviso.
2. Se liberada, o eleitor informa o e-mail, escolhe uma opção e confirma.
3. Se o e-mail já tiver votado naquela seção, recebe um aviso específico.
4. Após confirmar, vê apenas a mensagem de sucesso — **nenhum resultado é exibido ao eleitor**.

---

## 5. Estrutura do banco

| Tabela | Função |
|---|---|
| `profiles` | Perfil do usuário do Auth (ADM) |
| `elections` | Cada votação independente |
| `groups` | SAF, UMP... com `slug` único (link) |
| `candidates` | Nomes das opções |
| `rounds` | Seções/escrutínios com `is_open` |
| `votes` | `voter_hash` + `round_id`, com `unique (round_id, voter_hash)` |

Funções `SECURITY DEFINER`:

- `get_voting_group(slug)` — devolve nome do grupo, título e opções ao eleitor (sem votos/e-mails).
- `cast_vote(group, candidate, email)` — valida seção aberta, candidato, formato e duplicidade; grava o voto com HMAC.
- `get_group_results(group)` — apuração por seção, somente para o dono da votação.

---

## 6. Stack

Vite + React + TypeScript + Tailwind CSS · Supabase (Auth, Postgres, RLS) · `qrcode`.
