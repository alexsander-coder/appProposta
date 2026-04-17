import type { CompositeNavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useHousehold } from "../context/HouseholdContext";
import { useTheme } from "../context/ThemeContext";
import type { MainTabParamList, MoreStackParamList } from "../navigation/types";
import { supabase } from "../services/supabase/client";
import { useShellStyles } from "../hooks/useShellStyles";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList, "MoreMenu">,
  BottomTabNavigationProp<MainTabParamList>
>;

const Row = ({
  label,
  hint,
  onPress,
  shell,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  shell: ReturnType<typeof useShellStyles>["shell"];
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      shell.row,
      styles.rowPress,
      pressed && styles.pressed,
    ]}
  >
    <View style={styles.rowText}>
      <Text style={shell.rowTitle}>{label}</Text>
      {hint ? <Text style={shell.rowMeta}>{hint}</Text> : null}
    </View>
    <Text style={[shell.linkText, styles.chevron]}>›</Text>
  </Pressable>
);

export function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const { shell } = useShellStyles();
  const { colors } = useTheme();
  const { householdName } = useHousehold();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView
      style={shell.flex}
      contentContainerStyle={[shell.scroll, styles.scrollBottom]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={shell.eyebrow}>Lar em Dia</Text>
      <Text style={shell.screenTitle}>Mais</Text>
      <Text style={shell.mutedLine}>{householdName}</Text>

      <View style={[shell.glassCard, styles.hero]}>
        <Text style={[styles.heroEyebrow, { color: colors.textSecondary }]}>
          Preferencias
        </Text>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Ajustes da sua experiencia
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          Convites, conta e tema visual com a mesma linguagem Minimal Luxury.
        </Text>
      </View>

      <Text style={shell.section}>Conta e casa</Text>
      <Row
        shell={shell}
        label="Convidar membro"
        hint="Gere um codigo para alguem entrar na casa"
        onPress={() => navigation.navigate("Invite")}
      />
      <Row
        shell={shell}
        label="Aceitar convite"
        hint="Entrar em outra casa com um codigo"
        onPress={() => navigation.navigate("AcceptInvite")}
      />

      <Text style={shell.section}>Preferencias</Text>
      <Row
        shell={shell}
        label="Aparência"
        hint="Tema claro, escuro ou do sistema"
        onPress={() => navigation.navigate("ThemeSettings")}
      />

      <Pressable
        onPress={signOut}
        style={({ pressed }) => [
          shell.signOutBtn,
          styles.signOut,
          pressed && styles.pressed,
        ]}
      >
        <Text style={shell.signOutText}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollBottom: { paddingBottom: 32 },
  hero: { gap: 8 },
  heroEyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", fontWeight: "600" },
  heroTitle: { fontSize: 24, lineHeight: 28, fontWeight: "700", letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 14, lineHeight: 21 },
  rowPress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: { flex: 1 },
  chevron: { fontSize: 22, fontWeight: "300" },
  signOut: { marginTop: 28 },
  pressed: { opacity: 0.88 },
});
