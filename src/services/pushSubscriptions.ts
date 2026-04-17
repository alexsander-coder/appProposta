import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { supabase } from "./supabase/client";
import {
  getExpoPushToken,
  type NotificationPermissionState,
} from "./notifications";
import { randomUUID } from "../utils/uuid";

const INSTALLATION_ID_KEY = "lar-em-dia:installation-id";

async function getInstallationId(): Promise<string> {
  const saved = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (saved) {
    return saved;
  }
  const created = randomUUID();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
}

type Params = {
  householdId: string;
  userId: string;
  permission: NotificationPermissionState;
};

export async function syncPushSubscription({
  householdId,
  userId,
  permission,
}: Params): Promise<void> {
  const installationId = await getInstallationId();

  if (permission !== "granted") {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("household_id", householdId)
      .eq("installation_id", installationId);
    return;
  }

  const expoPushToken = await getExpoPushToken();
  if (!expoPushToken) {
    return;
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      household_id: householdId,
      installation_id: installationId,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      permission_status: permission,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "household_id,user_id,installation_id",
    }
  );

  if (error) {
    throw error;
  }
}
