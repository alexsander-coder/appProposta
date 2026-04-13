import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

import { AppShell } from "../components/layout/AppShell";
import { HouseholdProvider } from "../context/HouseholdContext";
import { useTheme } from "../context/ThemeContext";
import { MainTabNavigator } from "../navigation/MainTabNavigator";
import { AcceptInviteScreen } from "../screens/AcceptInviteScreen";
import { CreateHouseholdScreen } from "../screens/CreateHouseholdScreen";
import { supabase } from "../services/supabase/client";

import { appStyles } from "./appStyles";

type Household = {
  id: string;
  name: string;
};

/** Resolve household do utilizador e fornece contexto antes das tabs. */
export function HouseholdBootstrap({
  userId,
  email,
}: {
  userId: string;
  email?: string;
}) {
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
        <View style={appStyles.loading}>
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
