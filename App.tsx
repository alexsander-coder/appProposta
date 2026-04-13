import { NavigationContainer } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppShell } from "./src/components/AppShell";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { HouseholdProvider } from "./src/context/HouseholdContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { buildNavigationTheme } from "./src/navigation/navigationTheme";
import { MainTabNavigator } from "./src/navigation/MainTabNavigator";
import { AcceptInviteScreen } from "./src/screens/AcceptInviteScreen";
import { CreateHouseholdScreen } from "./src/screens/CreateHouseholdScreen";
import { supabase } from "./src/lib/supabase";

type Household = {
  id: string;
  name: string;
};

function HouseholdGate({ userId, email }: { userId: string; email?: string }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [householdNameInput, setHouseholdNameInput] = useState("");
  const [household, setHousehold] = useState<Household | null>(null);
  const [preHouseholdEntry, setPreHouseholdEntry] = useState<"create" | "accept">(
    "create"
  );

  const loadHousehold = async () => {
    setLoading(true);
    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      setLoading(false);
      Alert.alert("Erro ao carregar household", membershipError.message);
      return;
    }

    if (!membership?.household_id) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    const { data: householdData, error: householdError } = await supabase
      .from("households")
      .select("id, name")
      .eq("id", membership.household_id)
      .single();

    setLoading(false);
    if (householdError) {
      Alert.alert("Erro ao carregar dados da casa", householdError.message);
      return;
    }

    setHousehold(householdData);
  };

  useEffect(() => {
    loadHousehold();
  }, [userId]);

  const createHousehold = async () => {
    if (!householdNameInput.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome da household.");
      return;
    }

    setCreating(true);
    const { error } = await supabase
      .from("households")
      .insert({ name: householdNameInput.trim(), owner_id: userId });

    setCreating(false);
    if (error) {
      Alert.alert("Erro ao criar household", error.message);
      return;
    }

    setHouseholdNameInput("");
    await loadHousehold();
  };

  if (loading) {
    return (
      <AppShell>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </AppShell>
    );
  }

  if (!household && preHouseholdEntry === "accept") {
    return (
      <AppShell>
        <AcceptInviteScreen
          onBack={() => setPreHouseholdEntry("create")}
          onSuccess={async () => {
            await loadHousehold();
            setPreHouseholdEntry("create");
          }}
        />
      </AppShell>
    );
  }

  if (!household) {
    return (
      <CreateHouseholdScreen
        value={householdNameInput}
        onChange={setHouseholdNameInput}
        onSubmit={createHousehold}
        loading={creating}
        onOpenAcceptInvite={() => setPreHouseholdEntry("accept")}
      />
    );
  }

  return (
    <HouseholdProvider
      value={{
        userId,
        email,
        householdId: household.id,
        householdName: household.name,
        refreshHousehold: loadHousehold,
      }}
    >
      <MainTabNavigator />
    </HouseholdProvider>
  );
}

function RootApp() {
  const { colors, isDark } = useTheme();
  const { loading, session } = useAuth();

  const navigationTheme = useMemo(
    () => buildNavigationTheme(isDark, colors),
    [isDark, colors]
  );

  if (loading) {
    return (
      <AppShell>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </AppShell>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {session ? (
        <HouseholdGate userId={session.user.id} email={session.user.email} />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
