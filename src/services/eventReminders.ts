import { supabase } from "./supabase/client";

type UpsertEventReminderParams = {
  eventId: string;
  householdId: string;
  userId: string;
  startsAtIso: string | null;
  remindOffsetMinutes: number;
};

function computeSendAt(startsAtIso: string, remindOffsetMinutes: number): string {
  const startsAt = new Date(startsAtIso).getTime();
  const reminderTime = startsAt - remindOffsetMinutes * 60 * 1000;
  const now = Date.now();
  return new Date(Math.max(reminderTime, now)).toISOString();
}

export async function upsertEventReminder({
  eventId,
  householdId,
  userId,
  startsAtIso,
  remindOffsetMinutes,
}: UpsertEventReminderParams): Promise<void> {
  if (!startsAtIso) {
    await supabase.from("event_reminders").delete().eq("event_id", eventId);
    return;
  }

  const sendAt = computeSendAt(startsAtIso, remindOffsetMinutes);
  const { error } = await supabase.from("event_reminders").upsert(
    {
      event_id: eventId,
      household_id: householdId,
      created_by: userId,
      scheduled_for: startsAtIso,
      send_at: sendAt,
      remind_offset_minutes: remindOffsetMinutes,
      updated_at: new Date().toISOString(),
      sent_at: null,
    },
    { onConflict: "event_id" }
  );

  if (error) {
    throw error;
  }
}
