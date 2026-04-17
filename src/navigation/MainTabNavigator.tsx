import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import { AppShell } from "../components/layout/AppShell";
import { StackHeaderGradient } from "../components/navigation/StackHeaderGradient";
import { useHousehold } from "../context/HouseholdContext";
import { useTheme } from "../context/ThemeContext";
import { AcceptInviteScreen } from "../screens/AcceptInviteScreen";
import { AgendaScreen } from "../screens/AgendaScreen";
import { AlertsScreen } from "../screens/AlertsScreen";
import { BillsScreen } from "../screens/BillsScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { DocumentsScreen } from "../screens/DocumentsScreen";
import { HomeManagementScreen } from "../screens/HomeManagementScreen";
import { InviteMemberScreen } from "../screens/InviteMemberScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { PlanScreen } from "../screens/PlanScreen";
import { ShoppingListScreen } from "../screens/ShoppingListScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { ThemeSettingsScreen } from "../screens/ThemeSettingsScreen";
import type {
  HomeStackParamList,
  MainTabParamList,
  MoreStackParamList,
  PlanStackParamList,
} from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const PlanStack = createNativeStackNavigator<PlanStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

const TAB_ICON_SIZE = 22;

function InviteRoute() {
  const { householdId, userId, householdName } = useHousehold();
  return (
    <InviteMemberScreen
      householdId={householdId}
      userId={userId}
      householdName={householdName}
    />
  );
}

function AcceptInviteRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { refreshHousehold } = useHousehold();
  return (
    <AcceptInviteScreen
      onSuccess={async () => {
        await refreshHousehold();
        navigation.goBack();
      }}
    />
  );
}

function MoreStackNavigator() {
  const { colors } = useTheme();

  const headerOptions = {
    headerBackground: () => <StackHeaderGradient />,
    headerStyle: { backgroundColor: "transparent" },
    headerTintColor: colors.textPrimary,
    headerTitleStyle: {
      color: colors.textPrimary,
      fontWeight: "800" as const,
    },
    headerShadowVisible: false,
    headerBlurEffect: undefined,
    contentStyle: { backgroundColor: "transparent" },
  };

  return (
    <MoreStack.Navigator screenOptions={headerOptions}>
      <MoreStack.Screen
        name="MoreMenu"
        component={MoreScreen}
        options={{ headerShown: false }}
      />
      <MoreStack.Screen
        name="ThemeSettings"
        component={ThemeSettingsScreen}
        options={{ title: "Aparência" }}
      />
      <MoreStack.Screen
        name="Invite"
        component={InviteRoute}
        options={{ title: "Convidar membro" }}
      />
      <MoreStack.Screen
        name="AcceptInvite"
        component={AcceptInviteRoute}
        options={{ title: "Aceitar convite" }}
      />
    </MoreStack.Navigator>
  );
}

function DocumentsRoute() {
  const { householdId, userId } = useHousehold();
  return <DocumentsScreen householdId={householdId} userId={userId} />;
}

function AgendaRoute() {
  const { householdId, userId } = useHousehold();
  return <AgendaScreen householdId={householdId} userId={userId} />;
}

function TasksRoute() {
  const { householdId, userId } = useHousehold();
  return <TasksScreen householdId={householdId} userId={userId} />;
}

function ShoppingRoute() {
  const { householdId, userId } = useHousehold();
  return <ShoppingListScreen householdId={householdId} userId={userId} />;
}

function BillsRoute() {
  const { householdId, userId } = useHousehold();
  return <BillsScreen householdId={householdId} userId={userId} />;
}

function AlertsRoute() {
  const { householdId, userId } = useHousehold();
  return <AlertsScreen householdId={householdId} userId={userId} />;
}

function PlanStackNavigator() {
  return (
    <PlanStack.Navigator screenOptions={{ headerShown: false }}>
      <PlanStack.Screen name="PlanOverview" component={PlanScreen} />
      <PlanStack.Screen name="Tasks" component={TasksRoute} />
      <PlanStack.Screen name="Agenda" component={AgendaRoute} />
    </PlanStack.Navigator>
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeOverview" component={HomeManagementScreen} />
      <HomeStack.Screen name="Shopping" component={ShoppingRoute} />
      <HomeStack.Screen name="Bills" component={BillsRoute} />
      <HomeStack.Screen name="Documents" component={DocumentsRoute} />
    </HomeStack.Navigator>
  );
}

export function MainTabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  /** Área útil (ícone + rótulo), sem contar o inset do sistema. */
  const tabContentHeight = 40;
  const tabBarBottomPad = Math.max(insets.bottom, 4);
  const tabBarTotalHeight = tabContentHeight + tabBarBottomPad;

  return (
    <AppShell omitBottomSafeArea>
      <Tab.Navigator
        safeAreaInsets={{ bottom: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.glass,
            borderTopColor: colors.glassBorder,
            borderTopWidth: 1,
            height: tabBarTotalHeight,
            paddingTop: 4,
            paddingBottom: tabBarBottomPad,
            paddingHorizontal: 2,
          },
          tabBarItemStyle: {
            paddingVertical: 0,
            height: tabContentHeight,
            justifyContent: "center",
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            marginTop: 0,
            marginBottom: 0,
          },
          tabBarIconStyle: {
            marginTop: 0,
            marginBottom: 0,
          },
        }}
      >
        <Tab.Screen
          name="Today"
          component={DashboardScreen}
          options={{
            title: "Hoje",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Plan"
          component={PlanStackNavigator}
          options={{
            title: "Planejar",
            tabBarIcon: ({ color }) => (
              <Ionicons
                name="calendar-clear-outline"
                size={TAB_ICON_SIZE}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Home"
          component={HomeStackNavigator}
          options={{
            title: "Casa",
            tabBarIcon: ({ color }) => (
              <Ionicons name="grid-outline" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Alerts"
          component={AlertsRoute}
          options={{
            title: "Alertas",
            tabBarIcon: ({ color }) => (
              <Ionicons name="notifications-outline" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="More"
          component={MoreStackNavigator}
          options={{
            title: "Mais",
            tabBarIcon: ({ color }) => (
              <Ionicons name="menu-outline" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </AppShell>
  );
}
