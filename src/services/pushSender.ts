import { supabase } from "./supabase/client";

type SendHouseholdPushParams = {
  householdId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  excludeUserId?: string;
};

export async function sendHouseholdPush({
  householdId,
  title,
  body,
  data,
  excludeUserId,
}: SendHouseholdPushParams): Promise<void> {
  const { error } = await supabase.functions.invoke("send-household-push", {
    body: {
      householdId,
      title,
      body,
      data,
      excludeUserId,
    },
  });

  if (error) {
    throw error;
  }
}
