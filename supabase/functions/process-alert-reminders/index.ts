// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase env vars ausentes");
    }

    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret) {
      const receivedSecret = req.headers.get("x-cron-secret");
      if (receivedSecret !== cronSecret) {
        return new Response(JSON.stringify({ error: "Nao autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const nowIso = new Date().toISOString();

    const { data: reminders, error: remindersError } = await admin
      .from("alert_reminders")
      .select(
        "id, alert_id, household_id, scheduled_for, remind_offset_minutes, household_alerts!inner(id, title, archived)"
      )
      .is("sent_at", null)
      .lte("send_at", nowIso)
      .order("send_at", { ascending: true })
      .limit(100);

    if (remindersError) {
      throw remindersError;
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let sentCount = 0;
    const sentReminderIds: string[] = [];

    for (const reminder of reminders) {
      processed += 1;
      const alertRow = reminder.household_alerts;
      if (!alertRow || alertRow.archived) {
        sentReminderIds.push(reminder.id);
        continue;
      }

      const { data: subscriptions } = await admin
        .from("push_subscriptions")
        .select("expo_push_token")
        .eq("household_id", reminder.household_id)
        .eq("permission_status", "granted");

      const tokens = (subscriptions ?? []).map((s) => s.expo_push_token);
      if (tokens.length === 0) {
        sentReminderIds.push(reminder.id);
        continue;
      }

      const dueLabel = new Date(reminder.scheduled_for).toLocaleString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        timeZone: BRAZIL_TIME_ZONE,
      });
      const offsetLabel =
        reminder.remind_offset_minutes === 0
          ? "agora"
          : `em ${reminder.remind_offset_minutes} minuto${reminder.remind_offset_minutes === 1 ? "" : "s"}`;

      const messages = tokens.map((to) => ({
        to,
        title: "Lembrete de alerta",
        body:
          reminder.remind_offset_minutes === 0
            ? `${alertRow.title} vence agora (${dueLabel}).`
            : `${alertRow.title} vence ${offsetLabel} (${dueLabel}).`,
        sound: "default",
        priority: "high",
        data: {
          type: "alert_reminder",
          alertId: alertRow.id,
          householdId: reminder.household_id,
        },
      }));

      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });

      const expoJson = await expoRes.json();
      const results = Array.isArray(expoJson?.data) ? expoJson.data : [];
      const hasHardError = results.some(
        (item) => item?.status === "error" && item?.details?.error !== "DeviceNotRegistered"
      );

      if (!hasHardError) {
        sentReminderIds.push(reminder.id);
        sentCount += tokens.length;
      }
    }

    if (sentReminderIds.length > 0) {
      await admin
        .from("alert_reminders")
        .update({ sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in("id", sentReminderIds)
        .is("sent_at", null);
    }

    return new Response(
      JSON.stringify({
        processed,
        sentReminderIds: sentReminderIds.length,
        sentCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
