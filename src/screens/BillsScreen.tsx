import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";
import { supabase } from "../services/supabase/client";
import { logAppError } from "../utils/logError";

export type HouseholdBillRow = {
  id: string;
  title: string;
  provider: string | null;
  amount: string | null;
  due_day: number;
  notes: string | null;
  last_paid_period: string | null;
  created_at: string;
};

type Props = {
  householdId: string;
  userId: string;
};

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Data de vencimento no mês corrente (ajusta dia 31 em meses curtos). */
function dueCalendarDay(now: Date, dueDay: number): Date {
  const y = now.getFullYear();
  const m = now.getMonth();
  const cap = lastDayOfMonth(y, m);
  const day = Math.min(dueDay, cap);
  return new Date(y, m, day);
}

type BillUrgency = "paid" | "overdue" | "due_soon" | "ok";

function billUrgency(row: HouseholdBillRow, now: Date, period: string): BillUrgency {
  if (row.last_paid_period === period) {
    return "paid";
  }
  const due = startOfDay(dueCalendarDay(now, row.due_day));
  const today = startOfDay(now);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays <= 3) {
    return "due_soon";
  }
  return "ok";
}

function urgencyLabel(u: BillUrgency): string {
  switch (u) {
    case "paid":
      return "Paga este mês";
    case "overdue":
      return "Em atraso";
    case "due_soon":
      return "Vence em breve";
    default:
      return "A acompanhar";
  }
}

function sortBills(rows: HouseholdBillRow[]): HouseholdBillRow[] {
  return [...rows].sort((a, b) => {
    if (a.due_day !== b.due_day) {
      return a.due_day - b.due_day;
    }
    return a.title.localeCompare(b.title, "pt");
  });
}

export function BillsScreen({ householdId, userId }: Props) {
  const { colors } = useTheme();
  const { shell, placeholderColor } = useShellStyles();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills] = useState<HouseholdBillRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDayStr, setDueDayStr] = useState("10");
  const [notes, setNotes] = useState("");

  const sorted = useMemo(() => sortBills(bills), [bills]);

  const loadBills = useCallback(
    async (mode: "full" | "silent" = "full") => {
      if (mode === "full") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const { data, error } = await supabase
        .from("household_bills")
        .select(
          "id, title, provider, amount, due_day, notes, last_paid_period, created_at"
        )
        .eq("household_id", householdId)
        .order("due_day", { ascending: true });

      if (mode === "full") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
      if (error) {
        logAppError("bills.load", error, { householdId });
        Alert.alert("Erro ao carregar contas", error.message);
        return;
      }
      setBills((data ?? []) as HouseholdBillRow[]);
    },
    [householdId]
  );

  useEffect(() => {
    void loadBills("full");
  }, [loadBills]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setProvider("");
    setAmount("");
    setDueDayStr("10");
    setNotes("");
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (row: HouseholdBillRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setProvider(row.provider ?? "");
    setAmount(row.amount ?? "");
    setDueDayStr(String(row.due_day));
    setNotes(row.notes ?? "");
    setModalOpen(true);
  };

  const parseDueDay = (): number | null => {
    const n = Number.parseInt(dueDayStr.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 31) {
      return null;
    }
    return n;
  };

  const saveBill = async () => {
    if (!title.trim()) {
      Alert.alert("Título obrigatório", "Ex.: Luz, Água, Internet.");
      return;
    }
    const due = parseDueDay();
    if (due == null) {
      Alert.alert("Dia inválido", "Indique o dia do vencimento entre 1 e 31.");
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      provider: provider.trim() || null,
      amount: amount.trim() || null,
      due_day: due,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("household_bills")
        .update(payload)
        .eq("id", editingId)
        .eq("household_id", householdId);
      setSaving(false);
      if (error) {
        logAppError("bills.update", error, { editingId, householdId });
        Alert.alert("Erro ao atualizar", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("household_bills").insert({
        household_id: householdId,
        created_by: userId,
        ...payload,
      });
      setSaving(false);
      if (error) {
        logAppError("bills.insert", error, { householdId });
        Alert.alert("Erro ao criar", error.message);
        return;
      }
    }

    setModalOpen(false);
    resetForm();
    await loadBills("silent");
  };

  const confirmDelete = () => {
    if (!editingId) {
      return;
    }
    Alert.alert("Remover conta", "Deixa de aparecer para toda a casa.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSaving(true);
            const { error } = await supabase
              .from("household_bills")
              .delete()
              .eq("id", editingId)
              .eq("household_id", householdId);
            setSaving(false);
            if (error) {
              logAppError("bills.delete", error, { editingId, householdId });
              Alert.alert("Erro ao remover", error.message);
              return;
            }
            setModalOpen(false);
            resetForm();
            await loadBills("silent");
          })();
        },
      },
    ]);
  };

  const togglePaidThisMonth = async (row: HouseholdBillRow) => {
    const period = ym(new Date());
    const nextPeriod = row.last_paid_period === period ? null : period;
    const { error } = await supabase
      .from("household_bills")
      .update({
        last_paid_period: nextPeriod,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("household_id", householdId);
    if (error) {
      logAppError("bills.togglePaid", error, { id: row.id, householdId });
      Alert.alert("Erro", error.message);
      return;
    }
    await loadBills("silent");
  };

  const metaColor = (u: BillUrgency) => {
    if (u === "paid") {
      return colors.accentSoft;
    }
    if (u === "overdue") {
      return colors.danger;
    }
    if (u === "due_soon") {
      return colors.accent;
    }
    return colors.textMuted;
  };

  return (
    <View style={shell.flex}>
      <View style={shell.header}>
        <Text style={[shell.headerTitle, styles.headerTitleOnly]}>Contas</Text>
      </View>

      <Text style={[shell.mutedLine, styles.intro]}>
        Água, luz, internet, condomínio — dia de vencimento e marcação de paga
        no mês atual para toda a família ver.
      </Text>

      <View style={[shell.formBlock, styles.actionsRow]}>
        <Pressable
          onPress={openNew}
          style={({ pressed }) => [shell.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={shell.primaryBtnText}>Nova conta</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          style={shell.flex}
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={shell.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadBills("silent")}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={shell.empty}>
              Ainda sem contas. Adicione as da sua casa com o dia de vencimento.
            </Text>
          }
          renderItem={({ item }) => {
            const liveNow = new Date();
            const period = ym(liveNow);
            const u = billUrgency(item, liveNow, period);
            const paid = u === "paid";
            return (
              <View style={[shell.row, paid && styles.rowPaid]}>
                <Pressable
                  onPress={() => void togglePaidThisMonth(item)}
                  hitSlop={10}
                  style={styles.checkHit}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: paid }}
                >
                  <Ionicons
                    name={paid ? "checkmark-circle" : "ellipse-outline"}
                    size={26}
                    color={paid ? colors.accent : colors.textMuted}
                  />
                </Pressable>
                <Pressable onPress={() => openEdit(item)} style={styles.rowBody}>
                  <Text style={shell.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.provider ? (
                    <Text style={shell.rowMeta}>{item.provider}</Text>
                  ) : null}
                  {item.amount ? (
                    <Text style={shell.rowMeta}>{item.amount}</Text>
                  ) : null}
                  <Text style={shell.rowMeta}>
                    Vencimento: dia {item.due_day} de cada mês
                  </Text>
                  <Text style={[shell.rowMeta, { color: metaColor(u) }]}>
                    {urgencyLabel(u)}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setModalOpen(false);
          resetForm();
        }}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.gradientBottom }]}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => {
                setModalOpen(false);
                resetForm();
              }}
              style={styles.modalHeaderBtn}
            >
              <Text style={{ color: colors.accentSoft, fontWeight: "600" }}>
                Cancelar
              </Text>
            </Pressable>
            <Text style={[shell.headerTitle, styles.modalTitle]}>
              {editingId ? "Editar conta" : "Nova conta"}
            </Text>
            <Pressable
              onPress={() => void saveBill()}
              disabled={saving}
              style={styles.modalHeaderBtn}
            >
              <Text style={[shell.linkText, { opacity: saving ? 0.5 : 1 }]}>
                Guardar
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={shell.flex}
            contentContainerStyle={[shell.scroll, styles.modalScroll]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={shell.label}>Nome</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Energia, Gás, Internet"
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />
            <Text style={shell.label}>Fornecedor (opcional)</Text>
            <TextInput
              value={provider}
              onChangeText={setProvider}
              placeholder="Empresa ou serviço"
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />
            <Text style={shell.label}>Valor de referência (opcional)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Ex.: 89,90 €"
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />
            <Text style={shell.label}>Dia do vencimento (1–31)</Text>
            <TextInput
              value={dueDayStr}
              onChangeText={setDueDayStr}
              placeholder="10"
              placeholderTextColor={placeholderColor}
              style={shell.input}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={shell.hint}>
              Em meses mais curtos, o dia é ajustado (ex.: 31 vira 30 ou 28).
            </Text>
            <Text style={shell.label}>Notas (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Referência multibanco, link..."
              placeholderTextColor={placeholderColor}
              style={[shell.input, styles.notesInput]}
              multiline
            />
            {editingId ? (
              <Pressable
                onPress={confirmDelete}
                disabled={saving}
                style={({ pressed }) => [
                  shell.signOutBtn,
                  pressed && styles.pressed,
                  saving && shell.primaryBtnDisabled,
                ]}
              >
                <Text style={[shell.signOutText, { color: colors.textSecondary }]}>
                  Remover conta
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitleOnly: { marginTop: 4 },
  intro: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 20,
  },
  actionsRow: { paddingBottom: 4 },
  loader: { marginTop: 24 },
  pressed: { opacity: 0.88 },
  rowPaid: { opacity: 0.75 },
  checkHit: { marginRight: 12, alignSelf: "flex-start", paddingTop: 2 },
  rowBody: { flex: 1, minWidth: 0 },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalHeaderBtn: { minWidth: 72, paddingVertical: 8 },
  modalTitle: { flex: 1, textAlign: "center", fontSize: 17 },
  modalScroll: { paddingBottom: 40 },
  notesInput: { minHeight: 88, textAlignVertical: "top" },
});
