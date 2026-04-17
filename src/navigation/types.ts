import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Auth: undefined;
  ThemeSettings: undefined;
};

export type PlanStackParamList = {
  PlanOverview: undefined;
  Tasks: undefined;
  Agenda: undefined;
};

export type HomeStackParamList = {
  HomeOverview: undefined;
  Shopping: undefined;
  Bills: undefined;
  Documents: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  ThemeSettings: undefined;
  Invite: undefined;
  AcceptInvite: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Plan: NavigatorScreenParams<PlanStackParamList>;
  Home: NavigatorScreenParams<HomeStackParamList>;
  Alerts: undefined;
  More: NavigatorScreenParams<MoreStackParamList>;
};

export type TodayTabNavigationParamList = {
  Today: undefined;
  Plan: NavigatorScreenParams<PlanStackParamList>;
  Home: NavigatorScreenParams<HomeStackParamList>;
  Documents: undefined;
  Agenda: undefined;
  Tasks: undefined;
  Shopping: undefined;
  Bills: undefined;
  Alerts: undefined;
};
