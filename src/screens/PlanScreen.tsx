import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ContextEntryCard } from "../components/cards/ContextEntryCard";
import { useHousehold } from "../context/HouseholdContext";
import { useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";
import type { PlanStackParamList } from "../navigation/types";
import { supabase } from "../services/supabase/client";

type Nav = NativeStackNavigationProp<PlanStackParamList, "PlanOverview">;

export function PlanScreen() {
  const navigation = useNavigation<Nav>();
  const { shell } = useShellStyles();
  const { colors } = useTheme();
  const { householdName, householdId } = useHousehold();
  const [loading, setLoading] = useState(true);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [upcomingEventCount, setUpcomingEventCount] = useState(0);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const [tasksRes, agendaRes] = await Promise.all([
      supabase
        .from("household_tasks")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .is("completed_at", null),
      supabase
        .from("household_events")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .gte("starts_at", nowIso),
    ]);

    if (!tasksRes.error) {
      setOpenTaskCount(tasksRes.count ?? 0);
    }
    if (!agendaRes.error) {
      setUpcomingEventCount(agendaRes.count ?? 0);
    }
    setLoading(false);
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary])
  );

  return (
    <ScrollView
      style={shell.flex}
      contentContainerStyle={[shell.scroll, styles.bottom]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={shell.eyebrow}>Lar em Dia</Text>
      <Text style={shell.screenTitle}>Planejar</Text>
      <Text style={shell.screenSubtitle}>{householdName}</Text>
      <Text style={shell.mutedLine}>
        Organize o que a casa precisa fazer e o que vai acontecer nos proximos dias.
      </Text>

      <View style={[shell.glassCard, styles.hero]}>
        <Text style={[styles.heroEyebrow, { color: colors.textSecondary }]}>
          Planejamento premium
        </Text>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Clareza para a semana inteira
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          Mantenha tarefas e compromissos em um fluxo simples, elegante e previsivel.
        </Text>
      </View>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Visao executiva</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <View style={shell.statsRow}>
            <View style={shell.stat}>
              <Text style={shell.statValue}>{openTaskCount}</Text>
              <Text style={shell.statLabel}>em aberto</Text>
            </View>
            <View style={shell.stat}>
              <Text style={shell.statValue}>{upcomingEventCount}</Text>
              <Text style={shell.statLabel}>proximos eventos</Text>
            </View>
          </View>
        )}
      </View>

      <Text style={shell.section}>Rotina</Text>
      <ContextEntryCard
        title="Tarefas"
        description="Acompanhe o que esta em aberto e distribua o que precisa ser feito."
        meta={
          openTaskCount === 0
            ? "Nada pendente no momento"
            : `${openTaskCount} tarefa${openTaskCount === 1 ? "" : "s"} em aberto`
        }
        count={String(openTaskCount)}
        onPress={() => navigation.navigate("Tasks")}
        borderColor={colors.glassBorder}
      />
      <ContextEntryCard
        title="Agenda"
        description="Veja compromissos futuros e registre eventos importantes da familia."
        meta={
          upcomingEventCount === 0
            ? "Nenhum compromisso futuro"
            : `${upcomingEventCount} compromisso${upcomingEventCount === 1 ? "" : "s"} a frente`
        }
        count={String(upcomingEventCount)}
        onPress={() => navigation.navigate("Agenda")}
        borderColor={colors.glassBorder}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bottom: { paddingBottom: 32 },
  loader: { marginVertical: 12 },
  hero: { gap: 8 },
  heroEyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", fontWeight: "600" },
  heroTitle: { fontSize: 26, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 14, lineHeight: 21 },
});
