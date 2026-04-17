import Ionicons from "@expo/vector-icons/Ionicons";
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
import type { TodayTabNavigationParamList } from "../navigation/types";
import { supabase } from "../services/supabase/client";

type TabNav = BottomTabNavigationProp<TodayTabNavigationParamList>;

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

  const nowHour = new Date().getHours();
  const greeting =
    nowHour < 12 ? "Bom dia" : nowHour < 18 ? "Boa tarde" : "Boa noite";

  const totalPriorityItems = urgentAlertCount + pendingBillsCount + openTaskCount;
  const summaryTone =
    totalPriorityItems > 0
      ? `${totalPriorityItems} prioridade${totalPriorityItems === 1 ? "" : "s"} pedem foco agora`
      : "Tudo essencial está em ordem";

  const primaryAction = (() => {
    if (urgentAlertCount > 0) {
      return {
        label: "Resolver alertas urgentes",
        onPress: () => navigation.navigate("Alerts"),
      };
    }
    if (pendingBillsCount > 0) {
      return {
        label: "Regularizar contas",
        onPress: () => navigation.navigate("Home", { screen: "Bills" }),
      };
    }
    if (openTaskCount > 0) {
      return {
        label: "Organizar tarefas",
        onPress: () => navigation.navigate("Plan", { screen: "Tasks" }),
      };
    }
    return {
      label: "Planejar semana",
      onPress: () => navigation.navigate("Plan", { screen: "PlanOverview" }),
    };
  })();

  const timelineItems = [
    {
      period: "Manha",
      title:
        upcomingEventCount > 0
          ? `${upcomingEventCount} compromisso${upcomingEventCount === 1 ? "" : "s"} na fila`
          : "Sem compromissos pela manha",
      hint: "Agenda",
      onPress: () => navigation.navigate("Plan", { screen: "Agenda" }),
    },
    {
      period: "Tarde",
      title:
        openTaskCount > 0
          ? `${openTaskCount} tarefa${openTaskCount === 1 ? "" : "s"} em aberto`
          : "Sem tarefas pendentes",
      hint: "Tarefas",
      onPress: () => navigation.navigate("Plan", { screen: "Tasks" }),
    },
    {
      period: "Noite",
      title:
        pendingBillsCount > 0
          ? `${pendingBillsCount} conta${pendingBillsCount === 1 ? "" : "s"} para revisar`
          : "Financeiro em dia por enquanto",
      hint: "Contas",
      onPress: () => navigation.navigate("Home", { screen: "Bills" }),
    },
  ] as const;

  const quickActions = [
    {
      label: "Novo alerta",
      hint: "Registrar prioridade",
      icon: "warning-outline" as const,
      onPress: () => navigation.navigate("Alerts"),
    },
    {
      label: "Novo evento",
      hint: "Abrir agenda",
      icon: "calendar-outline" as const,
      onPress: () => navigation.navigate("Plan", { screen: "Agenda" }),
    },
    {
      label: "Nova tarefa",
      hint: "Organizar rotina",
      icon: "checkmark-done-outline" as const,
      onPress: () => navigation.navigate("Plan", { screen: "Tasks" }),
    },
    {
      label: "Nova conta",
      hint: "Atualizar financeiro",
      icon: "card-outline" as const,
      onPress: () => navigation.navigate("Home", { screen: "Bills" }),
    },
  ];

  const groupedActions = [
    {
      label: "Planejar",
      items: quickActions.filter((item) =>
        item.label === "Novo evento" || item.label === "Nova tarefa"
      ),
    },
    {
      label: "Casa",
      items: quickActions.filter((item) =>
        item.label === "Novo alerta" || item.label === "Nova conta"
      ),
    },
  ] as const;

  const priorityItems = [
    {
      key: "alerts",
      title: "Alertas urgentes",
      value: urgentAlertCount,
      hint: "Abrir alertas importantes",
      icon: "warning-outline" as const,
      onPress: () => navigation.navigate("Alerts"),
    },
    {
      key: "bills",
      title: "Contas pendentes",
      value: pendingBillsCount,
      hint: "Revisar financeiro do mes",
      icon: "card-outline" as const,
      onPress: () => navigation.navigate("Home", { screen: "Bills" }),
    },
    {
      key: "events",
      title: "Proximo compromisso",
      value: upcomingEventCount,
      hint: "Ver agenda da familia",
      icon: "time-outline" as const,
      onPress: () => navigation.navigate("Plan", { screen: "Agenda" }),
    },
  ] as const;

  return (
    <ScrollView
      style={shell.flex}
      contentContainerStyle={[shell.scroll, styles.bottom]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={shell.eyebrow}>Lar em Dia</Text>
      <Text style={shell.screenTitle}>Hoje</Text>
      <Text style={shell.screenSubtitle}>{householdName}</Text>
      <Text style={shell.mutedLine}>{email ?? "usuario sem e-mail"}</Text>

      <View style={[shell.glassCard, styles.heroCard]}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}</Text>
        <Text style={[styles.heroHeadline, { color: colors.textPrimary }]}>Controle da rotina da casa</Text>
        <Text style={[styles.heroSummary, { color: colors.textSecondary }]}>{summaryTone}</Text>
        <View style={styles.heroStatsRow}>
          <View style={[styles.heroStatChip, { borderColor: colors.glassBorder }]}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.accentSoft} />
            <Text style={[styles.heroStatText, { color: colors.textPrimary }]}>
              {urgentAlertCount} urgentes
            </Text>
          </View>
          <View style={[styles.heroStatChip, { borderColor: colors.glassBorder }]}>
            <Ionicons name="wallet-outline" size={14} color={colors.accentSoft} />
            <Text style={[styles.heroStatText, { color: colors.textPrimary }]}>
              {pendingBillsCount} contas
            </Text>
          </View>
        </View>
        <Pressable
          onPress={primaryAction.onPress}
          style={({ pressed }) => [
            styles.heroButton,
            { borderColor: colors.heroCtaPrimaryBorder, backgroundColor: colors.heroCtaPrimaryBg },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.heroButtonText, { color: colors.textPrimary }]}>{primaryAction.label}</Text>
        </Pressable>
      </View>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Operacao de hoje</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <View style={styles.nowList}>
            {priorityItems.map((item, index) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.nowRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.glassBorder },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.nowRowIcon, { backgroundColor: colors.pillBg, borderColor: colors.glassBorder }]}>
                  <Ionicons name={item.icon} size={15} color={colors.accentSoft} />
                </View>
                <View style={styles.nowBody}>
                  <Text style={[styles.nowTitle, { color: colors.textSecondary }]}>{item.title}</Text>
                  <Text style={[shell.rowMeta, styles.nowHint]}>{item.hint}</Text>
                </View>
                <Text style={[styles.nowValue, { color: colors.textPrimary }]}>{item.value}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Linha do Dia</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <View style={styles.timeline}>
            {timelineItems.map((item, index) => (
              <Pressable
                key={item.period}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.timelineRow,
                  index > 0 && { borderTopColor: colors.glassBorder, borderTopWidth: 1 },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.timelinePeriod, { color: colors.textSecondary }]}>{item.period}</Text>
                <View style={styles.timelineBody}>
                  <Text style={shell.rowTitle}>{item.title}</Text>
                  <Text style={shell.rowMeta}>{item.hint}</Text>
                </View>
                <View style={[styles.timelineDot, { backgroundColor: colors.accentSoft }]} />
                <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Acoes Rapidas</Text>
        <View style={styles.groupedActions}>
          {groupedActions.map((group) => (
            <View key={group.label}>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group.label}</Text>
              <View style={styles.groupRow}>
                {group.items.map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={action.onPress}
                    style={({ pressed }) => [
                      styles.groupAction,
                      { borderColor: colors.glassBorder, backgroundColor: colors.pillBg },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name={action.icon} size={15} color={colors.accentSoft} />
                    <Text style={[styles.groupActionText, { color: colors.textPrimary }]}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Panorama da casa</Text>
        <View style={styles.metricsRow}>
          <Pressable onPress={() => navigation.navigate("Home", { screen: "Shopping" })} style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{pendingShoppingCount}</Text>
            <Text style={shell.rowMeta}>itens por comprar</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Home", { screen: "Documents" })} style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{documentCount}</Text>
            <Text style={shell.rowMeta}>documentos</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Alerts")} style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{activeAlertCount}</Text>
            <Text style={shell.rowMeta}>alertas ativos</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bottom: { paddingBottom: 32 },
  loader: { marginVertical: 12 },
  heroCard: {
    paddingTop: 24,
    paddingBottom: 18,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  heroHeadline: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  heroSummary: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  heroStatsRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  heroStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroStatText: { fontSize: 12, fontWeight: "600" },
  heroButton: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  heroButtonText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  nowList: { gap: 0 },
  nowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  nowRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nowBody: { flex: 1 },
  nowHint: { marginTop: 2 },
  nowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  nowTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  nowValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  timeline: {
    borderRadius: 14,
    overflow: "hidden",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  timelinePeriod: {
    width: 64,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  timelineBody: {
    flex: 1,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginRight: 2,
  },
  chevron: { fontSize: 22, fontWeight: "300" },
  groupedActions: { gap: 12 },
  groupTitle: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 8,
    fontWeight: "600",
  },
  groupRow: { flexDirection: "row", gap: 8 },
  groupAction: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  groupActionText: { fontSize: 13, fontWeight: "600" },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  pressed: { opacity: 0.88 },
});
