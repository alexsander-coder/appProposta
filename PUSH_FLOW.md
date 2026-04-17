# Fluxo de Push Notifications

## 1) Permissao no app

- A tela `AlertsScreen` pede permissao de notificacao.
- Com permissao concedida, o app busca o Expo Push Token do dispositivo.

## 2) Registro de dispositivo no banco

- O app sincroniza o token na tabela `public.push_subscriptions`.
- Chave de unicidade por dispositivo:
  - `household_id`
  - `user_id`
  - `installation_id`
- Quando permissao nao esta concedida, o registro local daquele dispositivo e removido.

## 3) Envio de push (proximo passo do backend)

- Um endpoint seguro (ex.: Supabase Edge Function) deve:
  - receber evento de negocio (alerta, tarefa, lembrete);
  - buscar tokens ativos em `push_subscriptions`;
  - enviar para a API do Expo Push (`https://exp.host/--/api/v2/push/send`);
  - registrar falhas e remover tokens invalidos.

### Implementado agora

- Edge Function: `send-household-push`
- Arquivo: `supabase/functions/send-household-push/index.ts`
- O app invoca essa funcao via `src/services/pushSender.ts`.
- Evento inicial ligado: criacao de alerta urgente em `AlertsScreen`.

## 4) Eventos recomendados para disparo

- Alerta urgente criado.
- Tarefa com prazo proximo.
- Evento da agenda com antecedencia configurada.
- Lembretes personalizados criados pelo usuario.

## 5) Evolucao para lembretes configuraveis

- Adicionar campos de lembrete nas entidades (ou tabela dedicada), ex.:
  - `remind_at`
  - `repeat_rule`
  - `enabled`
- O backend agenda e dispara conforme esses campos.

## 6) Como testar ponta a ponta

1. Fazer deploy da function:
   - `supabase functions deploy send-household-push`
2. Garantir migration aplicada:
   - `013_push_subscriptions.sql`
3. Abrir app em dois dispositivos/usuarios da mesma casa e ativar notificacoes.
4. Criar um alerta com prioridade urgente em um usuario.
5. Confirmar push recebido no outro usuario/dispositivo.

## 7) Lembrete 5 minutos antes do vencimento

### Implementado

- `household_alerts` agora possui `due_at`.
- Nova tabela `alert_reminders` para controlar lembrete pendente e envio.
- Ao criar/editar alerta com data/hora, o app grava reminder com `send_at = due_at - 5 minutos`.
- Edge Function `process-alert-reminders` processa reminders vencidos e envia push.

### Deploy e agendamento

1. Deploy da function:
   - `supabase functions deploy process-alert-reminders`
2. Definir secret opcional para chamada agendada:
   - `CRON_SECRET`
3. Criar agendamento para rodar a cada minuto:
   - chamar endpoint da function com header `x-cron-secret`.

## 8) Lembretes da agenda

### Implementado

- `household_events` agora suporta `remind_offset_minutes`.
- Nova tabela `event_reminders` para disparo de lembretes de eventos.
- Nova function: `process-event-reminders`.
- Na tela `Agenda`, o usuario escolhe a antecedencia do lembrete:
  - no horario, 5, 15, 30, 60 minutos ou 1 dia antes.

### Deploy

- `npx supabase@latest functions deploy process-event-reminders --no-verify-jwt`
- Criar cron de 1 minuto para `process-event-reminders` com `x-cron-secret`.
