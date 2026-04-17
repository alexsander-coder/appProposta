import { supabase } from "./supabase/client";

type UpsertAlertReminderParams = {
  alertId: string;
  householdId: string;
  userId: string;
  dueAtIso: string | null;
  remindOffsetMinutes: number;
};

function computeSendAt(dueAtIso: string, remindOffsetMinutes: number): string {
  const dueTime = new Date(dueAtIso).getTime();
  const reminderTime = dueTime - remindOffsetMinutes * 60 * 1000;
  const now = Date.now();
  return new Date(Math.max(reminderTime, now)).toISOString();
}

export async function upsertAlertReminder({
  alertId,
  householdId,
  userId,
  dueAtIso,
  remindOffsetMinutes,
}: UpsertAlertReminderParams): Promise<void> {
  if (!dueAtIso) {
    await supabase.from("alert_reminders").delete().eq("alert_id", alertId);
    return;
  }

  const sendAt = computeSendAt(dueAtIso, remindOffsetMinutes);
  const { error } = await supabase.from("alert_reminders").upsert(
    {
      alert_id: alertId,
      household_id: householdId,
      created_by: userId,
      scheduled_for: dueAtIso,
      send_at: sendAt,
      remind_offset_minutes: remindOffsetMinutes,
      updated_at: new Date().toISOString(),
      sent_at: null,
    },
    {
      onConflict: "alert_id",
    }
  );

  if (error) {
    throw error;
  }
}
