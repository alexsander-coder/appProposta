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
import type { HomeStackParamList } from "../navigation/types";
import { supabase } from "../services/supabase/client";

type Nav = NativeStackNavigationProp<HomeStackParamList, "HomeOverview">;

export function HomeManagementScreen() {
  const navigation = useNavigation<Nav>();
  const { shell } = useShellStyles();
  const { colors } = useTheme();
  const { householdName, householdId } = useHousehold();
  const [loading, setLoading] = useState(true);
  const [pendingShoppingCount, setPendingShoppingCount] = useState(0);
  const [pendingBillsCount, setPendingBillsCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const billPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [shoppingRes, billsRes, documentsRes] = await Promise.all([
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
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId),
    ]);

    if (!shoppingRes.error) {
      setPendingShoppingCount(shoppingRes.count ?? 0);
    }
    if (!documentsRes.error) {
      setDocumentCount(documentsRes.count ?? 0);
    }
    if (!billsRes.error && billsRes.data) {
      const rows = billsRes.data as { last_paid_period: string | null }[];
      setPendingBillsCount(
        rows.filter((row) => row.last_paid_period !== billPeriod).length
      );
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
      <Text style={shell.screenTitle}>Casa</Text>
      <Text style={shell.screenSubtitle}>{householdName}</Text>
      <Text style={shell.mutedLine}>
        Concentre aqui os recursos de apoio da casa, do mercado ao financeiro.
      </Text>

      <View style={[shell.glassCard, styles.hero]}>
        <Text style={[styles.heroEyebrow, { color: colors.textSecondary }]}>
          Operacao da casa
        </Text>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Base organizada, rotina mais leve
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          Compras, contas e documentos em um ambiente unico e refinado.
        </Text>
      </View>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Resumo da casa</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <View style={shell.statsRow}>
            <View style={shell.stat}>
              <Text style={shell.statValue}>{pendingBillsCount}</Text>
              <Text style={shell.statLabel}>contas pendentes</Text>
            </View>
            <View style={shell.stat}>
              <Text style={shell.statValue}>{pendingShoppingCount}</Text>
              <Text style={shell.statLabel}>itens a comprar</Text>
            </View>
            <View style={shell.stat}>
              <Text style={shell.statValue}>{documentCount}</Text>
              <Text style={shell.statLabel}>documentos</Text>
            </View>
          </View>
        )}
      </View>

      <Text style={shell.section}>Operacao da casa</Text>
      <ContextEntryCard
        title="Compras"
        description="Monte a lista compartilhada e acompanhe o que ainda falta comprar."
        meta={
          pendingShoppingCount === 0
            ? "Nada por comprar no momento"
            : `${pendingShoppingCount} item${pendingShoppingCount === 1 ? "" : "s"} pendente${pendingShoppingCount === 1 ? "" : "s"}`
        }
        count={String(pendingShoppingCount)}
        onPress={() => navigation.navigate("Shopping")}
        borderColor={colors.glassBorder}
      />
      <ContextEntryCard
        title="Contas"
        description="Veja o que esta pendente neste mes e mantenha a casa em dia."
        meta={
          pendingBillsCount === 0
            ? "Tudo em dia neste mes"
            : `${pendingBillsCount} conta${pendingBillsCount === 1 ? "" : "s"} por regularizar`
        }
        count={String(pendingBillsCount)}
        onPress={() => navigation.navigate("Bills")}
        borderColor={colors.glassBorder}
      />
      <ContextEntryCard
        title="Documentos"
        description="Guarde informacoes e arquivos importantes em um so lugar."
        meta={
          documentCount === 0
            ? "Nenhum arquivo guardado ainda"
            : `${documentCount} arquivo${documentCount === 1 ? "" : "s"} disponivel${documentCount === 1 ? "" : "eis"}`
        }
        count={String(documentCount)}
        onPress={() => navigation.navigate("Documents")}
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
