# Lar em Dia

Base inicial do aplicativo em React Native com Expo + Supabase Auth.

## Rodar localmente

1. Copie `.env.example` para `.env` e preencha as chaves do Supabase.
2. Instale dependencias:

```bash
npm install
```

3. Execute:

```bash
npm run start
```

### Ver logs do app no PC

Com o celular conectado ao mesmo projeto Expo, erros importantes tambem vao para o **terminal do Metro**
(linha `[LarEmDia:...]`). No dispositivo: menu do Expo Go → **Open JS Debugger** ou use `j` no Metro
para abrir o debugger.

## Escopo implementado

- Login com e-mail/senha
- Cadastro com e-mail/senha
- Persistencia de sessao em armazenamento seguro
- Controle de sessao e rota protegida basica
- Criacao de household e membro owner
- Entidades (pessoa, pet, veiculo, imovel, outro)
- Documentos: registro no Postgres, upload no Storage, abrir via URL assinada e log `view`

## Limite de tamanho por upload

- Padrao no app: **20 MB** por arquivo (foto ou PDF). Configuravel: `EXPO_PUBLIC_MAX_UPLOAD_MB` no `.env`.
- Vale alinhar com **Restrict file size** do bucket no Supabase (mesmo teto ou maior no painel).

## Storage: bucket obrigatorio

O erro **Bucket not found** significa que nao existe bucket com o nome que o app usa.

1. No Supabase: **Storage** → **New bucket**.
2. Nome: **`documents`** (exatamente assim, em minusculas), ou outro nome que preferir.
3. Marque como **Private** (nao publico).
4. Se usar outro nome, defina no `.env`:  
   `EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=seu_nome`  
   e ajuste as politicas SQL em `storage.objects` para `bucket_id = 'seu_nome'`.
5. Reinicie o Metro (`npm run start`) para carregar o `.env`.

## Proximo passo sugerido

- Edge Function para signed URL + auditoria centralizada
- Preview in-app (PDF/imagem) sem depender do browser externo

## Documentos no celular

- Ha dois botoes: **Arquivo (qualquer tipo)** e **Foto da galeria**. Em alguns Androids o seletor
  de arquivos retorna "cancelado" sem erro; a galeria costuma ser mais confiavel para imagens.
- O projeto esta com `newArchEnabled: false` para reduzir bugs de `ActivityResult` com modulos
  nativos ao gerar build proprio. No **Expo Go**, o comportamento pode variar; se persistir,
  teste com **development build**.

## SQL no Supabase (ordem)

1. **Trigger** que, ao inserir em `households`, cria linha em `household_members`
   (`owner` + `active`) para `owner_id`. (Instrucoes que ja passamos no chat.)

2. **Politica RLS de bootstrap** em `household_members`: sem ela, o trigger nao consegue
   inserir o primeiro membro (a politica antiga exigia admin ja existente). Rode o conteudo de
   `supabase/migrations/002_household_members_bootstrap_rls.sql` no **Editor SQL**.

3. **Politica `households_select_owner`**: o dono le a propria linha em `households` sem depender
   de membership. Rode `supabase/migrations/003_households_select_owner_break_rls_recursion.sql`.

4. **Funcao `is_active_member` corrigida** (obrigatorio se ainda aparece `stack depth limit exceeded`):
   a versao inicial consultava `household_members` com RLS ativo e as politicas chamavam de novo
   `is_active_member`, em loop. Rode `supabase/migrations/004_is_active_member_security_definer_no_rls.sql`
   no **Editor SQL**.

5. **Opcional:** `005_documents_delete_creator.sql` — quem criou o documento pode apagar a linha
   (rollback se o upload ao Storage falhar).

6. **Convites:** `006_household_invites.sql` — tabela `household_invites` + RPCs
   `create_household_invite` e `accept_household_invite`. Rode no **Editor SQL**.
   (Usa `extensions.gen_random_bytes`; a 006 ja chama `create extension pgcrypto`.)

7. Se a 006 foi rodada antes dessa correcao e aparece `gen_random_bytes does not exist`,
   execute `007_fix_invite_gen_random_bytes.sql` no **Editor SQL**.

## Convites (fluxo no app)

- **Dono/admin:** Inicio → **Convidar membro** → gera codigo → compartilha.
- **Novo usuario sem casa:** na tela de criar casa → **Ja tenho um convite**.
- **Usuario ja em uma casa:** Inicio → **Aceitar convite** (entra na casa mais recente apos atualizar).
- Codigo valido por **7 dias** (ajustavel no SQL).
