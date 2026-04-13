import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Auth: undefined;
  ThemeSettings: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  ThemeSettings: undefined;
  Invite: undefined;
  AcceptInvite: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Documents: undefined;
  More: NavigatorScreenParams<MoreStackParamList>;
};
