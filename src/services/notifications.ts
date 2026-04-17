import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

export type NotificationPermissionState = "granted" | "denied" | "undetermined";

function normalizePermissionStatus(
  status: Notifications.PermissionStatus
): NotificationPermissionState {
  if (status === "granted") {
    return "granted";
  }
  if (status === "denied") {
    return "denied";
  }
  return "undetermined";
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const settings = await Notifications.getPermissionsAsync();
  return normalizePermissionStatus(settings.status);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Padrão",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const settings = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return normalizePermissionStatus(settings.status);
}

export async function openAppNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

function getExpoProjectId(): string | null {
  const fromConfig =
    Constants.expoConfig?.extra &&
    typeof Constants.expoConfig.extra === "object" &&
    "eas" in Constants.expoConfig.extra &&
    Constants.expoConfig.extra.eas &&
    typeof Constants.expoConfig.extra.eas === "object" &&
    "projectId" in Constants.expoConfig.extra.eas &&
    typeof Constants.expoConfig.extra.eas.projectId === "string"
      ? Constants.expoConfig.extra.eas.projectId
      : null;

  const fromEasConfig =
    Constants.easConfig && typeof Constants.easConfig.projectId === "string"
      ? Constants.easConfig.projectId
      : null;

  return fromConfig ?? fromEasConfig ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? null;
}

export async function getExpoPushToken(): Promise<string | null> {
  const status = await getNotificationPermissionState();
  if (status !== "granted") {
    return null;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    throw new Error(
      "Defina EXPO_PUBLIC_EAS_PROJECT_ID ou configure EAS projectId no app."
    );
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
