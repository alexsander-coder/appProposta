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
      .from("event_reminders")
      .select(
        "id, event_id, household_id, scheduled_for, remind_offset_minutes, household_events!inner(id, title)"
      )
      .is("sent_at", null)
      .lte("send_at", nowIso)
      .order("send_at", { ascending: true })
      .limit(100);

    if (remindersError) throw remindersError;

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let sentCount = 0;
    const sentIds: string[] = [];

    for (const reminder of reminders) {
      processed += 1;
      const eventRow = reminder.household_events;
      if (!eventRow) {
        sentIds.push(reminder.id);
        continue;
      }

      const { data: subscriptions } = await admin
        .from("push_subscriptions")
        .select("expo_push_token")
        .eq("household_id", reminder.household_id)
        .eq("permission_status", "granted");

      const tokens = (subscriptions ?? []).map((s) => s.expo_push_token);
      if (tokens.length === 0) {
        sentIds.push(reminder.id);
        continue;
      }

      const startLabel = new Date(reminder.scheduled_for).toLocaleString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        timeZone: BRAZIL_TIME_ZONE,
      });

      const body =
        reminder.remind_offset_minutes === 0
          ? `${eventRow.title} comeca agora (${startLabel}).`
          : `${eventRow.title} comeca em ${reminder.remind_offset_minutes} minuto${reminder.remind_offset_minutes === 1 ? "" : "s"} (${startLabel}).`;

      const messages = tokens.map((to) => ({
        to,
        title: "Lembrete da agenda",
        body,
        sound: "default",
        priority: "high",
        data: {
          type: "event_reminder",
          eventId: eventRow.id,
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
        sentIds.push(reminder.id);
        sentCount += tokens.length;
      }
    }

    if (sentIds.length > 0) {
      await admin
        .from("event_reminders")
        .update({ sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in("id", sentIds)
        .is("sent_at", null);
    }

    return new Response(
      JSON.stringify({ processed, sentReminderIds: sentIds.length, sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
