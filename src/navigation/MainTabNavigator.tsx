import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import { AppShell } from "../components/AppShell";
import { StackHeaderGradient } from "../components/StackHeaderGradient";
import { useHousehold } from "../context/HouseholdContext";
import { useTheme } from "../context/ThemeContext";
import { AcceptInviteScreen } from "../screens/AcceptInviteScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { DocumentsScreen } from "../screens/DocumentsScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { InviteMemberScreen } from "../screens/InviteMemberScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { ThemeSettingsScreen } from "../screens/ThemeSettingsScreen";
import type { MainTabParamList, MoreStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
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
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: "Início",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Tasks"
          component={TasksScreen}
          options={{
            title: "Tarefas",
            tabBarIcon: ({ color }) => (
              <Ionicons
                name="checkbox-outline"
                size={TAB_ICON_SIZE}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Documents"
          component={DocumentsRoute}
          options={{
            title: "Documentos",
            tabBarIcon: ({ color }) => (
              <Ionicons name="document-text-outline" size={TAB_ICON_SIZE} color={color} />
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
