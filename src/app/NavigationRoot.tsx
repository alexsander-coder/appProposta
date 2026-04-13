import { NavigationContainer } from "@react-navigation/native";
import { useMemo } from "react";
import { ActivityIndicator, View } from "react-native";

import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AuthNavigator } from "../navigation/AuthNavigator";
import { buildNavigationTheme } from "../navigation/navigationTheme";

import { HouseholdBootstrap } from "./HouseholdBootstrap";
import { appStyles } from "./appStyles";

/** Árvore de navegação após providers (tema + auth). */
export function NavigationRoot() {
  const { colors, isDark } = useTheme();
  const { loading, session } = useAuth();

  const navigationTheme = useMemo(
    () => buildNavigationTheme(isDark, colors),
    [isDark, colors]
  );

  if (loading) {
    return (
      <AppShell>
        <View style={appStyles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </AppShell>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {session ? (
        <HouseholdBootstrap userId={session.user.id} email={session.user.email} />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
