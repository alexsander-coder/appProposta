import {
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useHousehold } from "../context/HouseholdContext";
import { useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";
import type { MainTabParamList } from "../navigation/types";
import { supabase } from "../services/supabase/client";

type TabNav = BottomTabNavigationProp<MainTabParamList>;

export function DashboardScreen() {
  const { colors } = useTheme();
  const { shell } = useShellStyles();
  const navigation = useNavigation<TabNav>();
  const { email, householdName, householdId } = useHousehold();
  const [statsLoading, setStatsLoading] = useState(true);
  const [documentCount, setDocumentCount] = useState(0);
  const [upcomingEventCount, setUpcomingEventCount] = useState(0);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [pendingShoppingCount, setPendingShoppingCount] = useState(0);
  const [pendingBillsCount, setPendingBillsCount] = useState(0);
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [urgentAlertCount, setUrgentAlertCount] = useState(0);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const nowIso = new Date().toISOString();
    const now = new Date();
    const billPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [docsRes, agendaRes, tasksRes, shoppingRes, billsRes, alertsRes] =
      await Promise.all([
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId),
      supabase
        .from("household_events")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .gte("starts_at", nowIso),
      supabase
        .from("household_tasks")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .is("completed_at", null),
      supabase
        .from("household_shopping_items")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("purchased", false),
      supabase
        .from("household_bills")
        .select("last_paid_period")
        .eq("household_id", householdId),
      supabase
        .from("household_alerts")
        .select("priority, archived")
        .eq("household_id", householdId),
    ]);
    setStatsLoading(false);
    if (!docsRes.error) {
      setDocumentCount(docsRes.count ?? 0);
    }
    if (!agendaRes.error) {
      setUpcomingEventCount(agendaRes.count ?? 0);
    }
    if (!tasksRes.error) {
      setOpenTaskCount(tasksRes.count ?? 0);
    }
    if (!shoppingRes.error) {
      setPendingShoppingCount(shoppingRes.count ?? 0);
    }
    if (!billsRes.error && billsRes.data) {
      const rows = billsRes.data as { last_paid_period: string | null }[];
      setPendingBillsCount(
        rows.filter((r) => r.last_paid_period !== billPeriod).length
      );
    }
    if (!alertsRes.error && alertsRes.data) {
      const alerts = alertsRes.data as {
        priority: string;
        archived: boolean;
      }[];
      const active = alerts.filter((a) => !a.archived);
      setActiveAlertCount(active.length);
      setUrgentAlertCount(active.filter((a) => a.priority === "high").length);
    }
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );

  return (
    <ScrollView
      style={shell.flex}
      contentContainerStyle={[shell.scroll, styles.bottom]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={shell.eyebrow}>Lar em Dia</Text>
      <Text style={shell.screenTitle}>Painel da casa</Text>
      <Text style={shell.screenSubtitle}>{householdName}</Text>
      <Text style={shell.mutedLine}>{email ?? "usuario sem e-mail"}</Text>

      <Text style={[shell.mutedLine, styles.vision]}>
        Um só lugar para a rotina da família — tarefas, compras, contas, agenda,
        documentos e alertas, com visão partilhada de quem mora junto.
      </Text>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Já disponível</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <>
            <Pressable
              onPress={() => navigation.navigate("Documents")}
              style={({ pressed }) => [styles.docRow, pressed && styles.pressed]}
            >
              <View style={styles.docRowInner}>
                <Text style={shell.rowTitle}>Documentos da casa</Text>
                <Text style={shell.rowMeta}>
                  {documentCount === 0
                    ? "Nenhum arquivo ainda — toque para adicionar"
                    : `${documentCount} arquivo${documentCount === 1 ? "" : "s"} guardado${documentCount === 1 ? "" : "s"}`}
                </Text>
              </View>
              <Text style={[shell.linkText, styles.chevron]}>›</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Agenda")}
              style={({ pressed }) => [
                styles.docRow,
                styles.docRowSecond,
                { borderTopColor: colors.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.docRowInner}>
                <Text style={shell.rowTitle}>Agenda da família</Text>
                <Text style={shell.rowMeta}>
                  {upcomingEventCount === 0
                    ? "Nenhum compromisso futuro — toque para planear"
                    : `${upcomingEventCount} compromisso${upcomingEventCount === 1 ? "" : "s"} à frente`}
                </Text>
              </View>
              <Text style={[shell.linkText, styles.chevron]}>›</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Tasks")}
              style={({ pressed }) => [
                styles.docRow,
                styles.docRowSecond,
                { borderTopColor: colors.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.docRowInner}>
                <Text style={shell.rowTitle}>Tarefas da casa</Text>
                <Text style={shell.rowMeta}>
                  {openTaskCount === 0
                    ? "Nada pendente — toque para adicionar"
                    : `${openTaskCount} em aberto`}
                </Text>
              </View>
              <Text style={[shell.linkText, styles.chevron]}>›</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Shopping")}
              style={({ pressed }) => [
                styles.docRow,
                styles.docRowSecond,
                { borderTopColor: colors.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.docRowInner}>
                <Text style={shell.rowTitle}>Lista de compras</Text>
                <Text style={shell.rowMeta}>
                  {pendingShoppingCount === 0
                    ? "Nada por comprar — toque para preencher"
                    : `${pendingShoppingCount} por comprar`}
                </Text>
              </View>
              <Text style={[shell.linkText, styles.chevron]}>›</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Bills")}
              style={({ pressed }) => [
                styles.docRow,
                styles.docRowSecond,
                { borderTopColor: colors.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.docRowInner}>
                <Text style={shell.rowTitle}>Contas da casa</Text>
                <Text style={shell.rowMeta}>
                  {pendingBillsCount === 0
                    ? "Tudo em dia este mês ou sem contas — toque para gerir"
                    : `${pendingBillsCount} por regularizar este mês`}
                </Text>
              </View>
              <Text style={[shell.linkText, styles.chevron]}>›</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Alerts")}
              style={({ pressed }) => [
                styles.docRow,
                styles.docRowSecond,
                { borderTopColor: colors.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.docRowInner}>
                <Text style={shell.rowTitle}>Alertas importantes</Text>
                <Text style={shell.rowMeta}>
                  {activeAlertCount === 0
                    ? "Nenhum alerta ativo — toque para registar"
                    : urgentAlertCount > 0
                      ? `${activeAlertCount} ativo(s) — ${urgentAlertCount} urgente(s)`
                      : `${activeAlertCount} ativo(s)`}
                </Text>
              </View>
              <Text style={[shell.linkText, styles.chevron]}>›</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bottom: { paddingBottom: 32 },
  vision: { marginTop: 10, lineHeight: 22 },
  loader: { marginVertical: 12 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  docRowSecond: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  docRowInner: { flex: 1 },
  chevron: { fontSize: 22, fontWeight: "300" },
  pressed: { opacity: 0.88 },
});
