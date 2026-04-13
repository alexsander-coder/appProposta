import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";
import { supabase } from "../services/supabase/client";
import { logAppError } from "../utils/logError";

export type HouseholdTaskRow = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
};

type Props = {
  householdId: string;
  userId: string;
};

const LOCALE = "pt-BR";

function sortTasks(rows: HouseholdTaskRow[]): HouseholdTaskRow[] {
  return [...rows].sort((a, b) => {
    const aDone = Boolean(a.completed_at);
    const bDone = Boolean(b.completed_at);
    if (aDone !== bDone) {
      return aDone ? 1 : -1;
    }
    const ad = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
    if (ad !== bd) {
      return ad - bd;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function dueMetaParts(
  dueAt: string | null,
  done: boolean
): { text: string; overdue: boolean } | null {
  if (!dueAt || done) {
    return null;
  }
  const d = new Date(dueAt);
  const day = d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
  });
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startDue.getTime() - startToday.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays < 0) {
    return { text: `Atrasada · ${day}`, overdue: true };
  }
  if (diffDays === 0) {
    return { text: `Hoje · ${day}`, overdue: false };
  }
  if (diffDays === 1) {
    return { text: `Amanhã · ${day}`, overdue: false };
  }
  return { text: `Prazo · ${day}`, overdue: false };
}

function toWebDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseWebDate(dateStr: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!dm) {
    return null;
  }
  return new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), 0, 0, 0, 0);
}

export function TasksScreen({ householdId, userId }: Props) {
  const { colors } = useTheme();
  const { shell, placeholderColor } = useShellStyles();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<HouseholdTaskRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [hasDue, setHasDue] = useState(false);
  const [dueDraft, setDueDraft] = useState(() => new Date());
  const [webDueStr, setWebDueStr] = useState(() => toWebDateStr(new Date()));
  const [assignToMe, setAssignToMe] = useState(false);
  const [iosDuePicker, setIosDuePicker] = useState(false);

  const sorted = useMemo(() => sortTasks(tasks), [tasks]);

  const loadTasks = useCallback(
    async (mode: "full" | "silent" = "full") => {
      if (mode === "full") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const { data, error } = await supabase
        .from("household_tasks")
        .select(
          "id, title, notes, due_at, assigned_to, completed_at, completed_by, created_at"
        )
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (mode === "full") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
      if (error) {
        logAppError("tasks.load", error, { householdId });
        Alert.alert("Erro ao carregar tarefas", error.message);
        return;
      }
      setTasks((data ?? []) as HouseholdTaskRow[]);
    },
    [householdId]
  );

  useEffect(() => {
    void loadTasks("full");
  }, [loadTasks]);

  const resetForm = () => {
    const d = new Date();
    setEditingId(null);
    setTitle("");
    setNotes("");
    setHasDue(false);
    setDueDraft(d);
    setWebDueStr(toWebDateStr(d));
    setAssignToMe(false);
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (row: HouseholdTaskRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setNotes(row.notes ?? "");
    setAssignToMe(row.assigned_to === userId);
    if (row.due_at) {
      setHasDue(true);
      const d = new Date(row.due_at);
      setDueDraft(d);
      setWebDueStr(toWebDateStr(d));
    } else {
      setHasDue(false);
      const d = new Date();
      setDueDraft(d);
      setWebDueStr(toWebDateStr(d));
    }
    setModalOpen(true);
  };

  const pickDueAndroid = () => {
    DateTimePickerAndroid.open({
      value: dueDraft,
      mode: "date",
      onChange: (e, date) => {
        if (e.type !== "set" || !date) {
          return;
        }
        setDueDraft(date);
      },
    });
  };

  const openDuePicker = () => {
    if (Platform.OS === "android") {
      pickDueAndroid();
    } else if (Platform.OS === "ios") {
      setIosDuePicker(true);
    }
  };

  const resolveDueIso = (): string | null => {
    if (!hasDue) {
      return null;
    }
    if (Platform.OS === "web") {
      const d = parseWebDate(webDueStr);
      return d ? d.toISOString() : null;
    }
    const d = new Date(dueDraft);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  const saveTask = async () => {
    if (!title.trim()) {
      Alert.alert("Título obrigatório", "Descreva a tarefa.");
      return;
    }
    const dueIso = resolveDueIso();
    if (hasDue && !dueIso) {
      Alert.alert("Data inválida", "Use AAAA-MM-DD na web ou escolha a data no telemóvel.");
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      due_at: dueIso,
      assigned_to: assignToMe ? userId : null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("household_tasks")
        .update(payload)
        .eq("id", editingId)
        .eq("household_id", householdId);
      setSaving(false);
      if (error) {
        logAppError("tasks.update", error, { editingId, householdId });
        Alert.alert("Erro ao atualizar", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("household_tasks").insert({
        household_id: householdId,
        created_by: userId,
        ...payload,
      });
      setSaving(false);
      if (error) {
        logAppError("tasks.insert", error, { householdId });
        Alert.alert("Erro ao criar tarefa", error.message);
        return;
      }
    }

    setModalOpen(false);
    resetForm();
    await loadTasks("silent");
  };

  const confirmDelete = () => {
    if (!editingId) {
      return;
    }
    Alert.alert("Remover tarefa", "Esta ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSaving(true);
            const { error } = await supabase
              .from("household_tasks")
              .delete()
              .eq("id", editingId)
              .eq("household_id", householdId);
            setSaving(false);
            if (error) {
              logAppError("tasks.delete", error, { editingId, householdId });
              Alert.alert("Erro ao remover", error.message);
              return;
            }
            setModalOpen(false);
            resetForm();
            await loadTasks("silent");
          })();
        },
      },
    ]);
  };

  const toggleDone = async (row: HouseholdTaskRow) => {
    const nowIso = new Date().toISOString();
    const nextCompleted = row.completed_at ? null : nowIso;
    const nextCompletedBy = row.completed_at ? null : userId;
    const { error } = await supabase
      .from("household_tasks")
      .update({
        completed_at: nextCompleted,
        completed_by: nextCompletedBy,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .eq("household_id", householdId);
    if (error) {
      logAppError("tasks.toggle", error, { id: row.id, householdId });
      Alert.alert("Erro", error.message);
      return;
    }
    await loadTasks("silent");
  };

  return (
    <View style={shell.flex}>
      <View style={shell.header}>
        <Text style={[shell.headerTitle, styles.headerTitleOnly]}>Tarefas</Text>
      </View>

      <Text style={[shell.mutedLine, styles.intro]}>
        Dividam o que a casa precisa: marcar feito, prazo opcional e “para mim”
        quando fizer sentido.
      </Text>

      <View style={[shell.formBlock, styles.actionsRow]}>
        <Pressable
          onPress={openNew}
          style={({ pressed }) => [shell.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={shell.primaryBtnText}>Nova tarefa</Text>
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
              onRefresh={() => void loadTasks("silent")}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={shell.empty}>
              Nenhuma tarefa ainda. Toque em “Nova tarefa”.
            </Text>
          }
          renderItem={({ item }) => {
            const done = Boolean(item.completed_at);
            const due = dueMetaParts(item.due_at, done);
            return (
              <View style={[shell.row, done && styles.rowDone]}>
                <Pressable
                  onPress={() => void toggleDone(item)}
                  hitSlop={10}
                  style={styles.checkHit}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                >
                  <Ionicons
                    name={done ? "checkmark-circle" : "ellipse-outline"}
                    size={26}
                    color={done ? colors.accent : colors.textMuted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => openEdit(item)}
                  style={styles.rowBody}
                >
                  <Text
                    style={[
                      shell.rowTitle,
                      done && styles.titleDone,
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {due ? (
                    <Text
                      style={[
                        shell.rowMeta,
                        due.overdue ? { color: colors.danger } : undefined,
                      ]}
                    >
                      {due.text}
                    </Text>
                  ) : null}
                  {item.assigned_to === userId && !done ? (
                    <Text style={shell.rowMeta}>Atribuída a mim</Text>
                  ) : null}
                  {item.notes ? (
                    <Text style={shell.rowMeta} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  ) : null}
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
            <Text style={[shell.headerTitle, styles.modalTitle]}>Tarefa</Text>
            <Pressable
              onPress={() => void saveTask()}
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
            <Text style={shell.label}>Título</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Comprar ração, marcar dentista..."
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />

            <View style={styles.switchRow}>
              <Text style={shell.label}>Com prazo (data)</Text>
              <Switch
                value={hasDue}
                onValueChange={setHasDue}
                trackColor={{ false: colors.glassBorder, true: colors.accent }}
              />
            </View>

            {hasDue ? (
              Platform.OS === "web" ? (
                <>
                  <Text style={shell.label}>Data limite (AAAA-MM-DD)</Text>
                  <TextInput
                    value={webDueStr}
                    onChangeText={setWebDueStr}
                    placeholder="2026-04-20"
                    placeholderTextColor={placeholderColor}
                    style={shell.input}
                    autoCapitalize="none"
                  />
                </>
              ) : (
                <Pressable
                  onPress={openDuePicker}
                  style={({ pressed }) => [shell.outlineBtn, pressed && styles.pressed]}
                >
                  <Text style={shell.outlineBtnText}>
                    Data:{" "}
                    {dueDraft.toLocaleDateString(LOCALE, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </Pressable>
              )
            ) : null}

            <View style={styles.switchRow}>
              <Text style={shell.label}>Atribuir a mim</Text>
              <Switch
                value={assignToMe}
                onValueChange={setAssignToMe}
                trackColor={{ false: colors.glassBorder, true: colors.accent }}
              />
            </View>

            <Text style={shell.label}>Notas (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Detalhes para a família"
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
                  Remover tarefa
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>

          {Platform.OS === "ios" && iosDuePicker ? (
            <Modal transparent visible animationType="fade">
              <View style={styles.iosPickerRoot}>
                <Pressable
                  style={styles.iosOverlay}
                  onPress={() => setIosDuePicker(false)}
                />
                <View
                  style={[
                    styles.iosSheet,
                    { backgroundColor: colors.inputBg, borderColor: colors.glassBorder },
                  ]}
                >
                  <DateTimePicker
                    value={dueDraft}
                    mode="date"
                    display="spinner"
                    locale={LOCALE}
                    onChange={(_, date) => {
                      if (date) {
                        setDueDraft(date);
                      }
                    }}
                  />
                  <Pressable
                    onPress={() => setIosDuePicker(false)}
                    style={shell.primaryBtn}
                  >
                    <Text style={shell.primaryBtnText}>OK</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          ) : null}
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
  rowDone: { opacity: 0.72 },
  checkHit: { marginRight: 12, alignSelf: "flex-start", paddingTop: 2 },
  rowBody: { flex: 1, minWidth: 0 },
  titleDone: { textDecorationLine: "line-through" },
  iosPickerRoot: { flex: 1, justifyContent: "flex-end" },
  iosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  iosSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
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
  modalTitle: { flex: 1, textAlign: "center", fontSize: 18 },
  modalScroll: { paddingBottom: 40 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 4,
  },
  notesInput: { minHeight: 88, textAlignVertical: "top" },
});
