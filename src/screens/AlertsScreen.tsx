import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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
  Switch,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";

import { useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";
import {
  getNotificationPermissionState,
  openAppNotificationSettings,
  requestNotificationPermission,
  type NotificationPermissionState,
} from "../services/notifications";
import { upsertAlertReminder } from "../services/alertReminders";
import { sendHouseholdPush } from "../services/pushSender";
import { syncPushSubscription } from "../services/pushSubscriptions";
import { supabase } from "../services/supabase/client";
import { logAppError } from "../utils/logError";

export type HouseholdAlertRow = {
  id: string;
  title: string;
  notes: string | null;
  priority: "normal" | "high";
  archived: boolean;
  due_at: string | null;
  remind_offset_minutes: number;
  created_at: string;
};

type Props = {
  householdId: string;
  userId: string;
};

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
const REMINDER_OPTIONS = [
  { value: 0, label: "No horario" },
  { value: 5, label: "5 min antes" },
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 dia antes" },
] as const;

function sortAlerts(rows: HouseholdAlertRow[]): HouseholdAlertRow[] {
  return [...rows].sort((a, b) => {
    if (a.archived !== b.archived) {
      return a.archived ? 1 : -1;
    }
    if (a.priority !== b.priority) {
      return a.priority === "high" ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function AlertsScreen({ householdId, userId }: Props) {
  const { colors } = useTheme();
  const { shell, placeholderColor } = useShellStyles();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<HouseholdAlertRow[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>("undetermined");
  const [updatingNotificationPermission, setUpdatingNotificationPermission] =
    useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [highPriority, setHighPriority] = useState(false);
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [remindOffsetMinutes, setRemindOffsetMinutes] = useState<number>(5);

  const syncSubscription = useCallback(
    async (permission: NotificationPermissionState) => {
      try {
        await syncPushSubscription({ householdId, userId, permission });
      } catch (error) {
        logAppError("alerts.notifications.syncSubscription", error, {
          householdId,
          permission,
        });
      }
    },
    [householdId, userId]
  );

  const loadAlerts = useCallback(
    async (mode: "full" | "silent" = "full") => {
      if (mode === "full") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const { data, error } = await supabase
        .from("household_alerts")
        .select(
          "id, title, notes, priority, archived, due_at, remind_offset_minutes, created_at"
        )
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (mode === "full") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
      if (error) {
        logAppError("alerts.load", error, { householdId });
        Alert.alert("Erro ao carregar alertas", error.message);
        return;
      }
      setRows((data ?? []) as HouseholdAlertRow[]);
    },
    [householdId]
  );

  useEffect(() => {
    void loadAlerts("full");
  }, [loadAlerts]);

  useEffect(() => {
    void (async () => {
      try {
        const status = await getNotificationPermissionState();
        setNotificationPermission(status);
        if (status === "undetermined") {
          setUpdatingNotificationPermission(true);
          try {
            const requestedStatus = await requestNotificationPermission();
            setNotificationPermission(requestedStatus);
            await syncSubscription(requestedStatus);
          } catch (error) {
            logAppError("alerts.notifications.autoRequestPermission", error);
          } finally {
            setUpdatingNotificationPermission(false);
          }
        } else {
          await syncSubscription(status);
        }
      } catch (error) {
        logAppError("alerts.notifications.loadPermission", error);
      }
    })();
  }, [syncSubscription]);

  const listData = useMemo(() => {
    const sorted = sortAlerts(rows);
    const active = sorted.filter((r) => !r.archived);
    const resolved = sorted.filter((r) => r.archived);
    if (showResolved) {
      return [...active, ...resolved];
    }
    return active;
  }, [rows, showResolved]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setNotes("");
    setHighPriority(false);
    setDueAt(null);
    setShowDuePicker(false);
    setRemindOffsetMinutes(5);
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: HouseholdAlertRow) => {
    setEditingId(item.id);
    setTitle(item.title);
    setNotes(item.notes ?? "");
    setHighPriority(item.priority === "high");
    setDueAt(item.due_at ? new Date(item.due_at) : null);
    setRemindOffsetMinutes(item.remind_offset_minutes ?? 5);
    setModalOpen(true);
  };

  const onChangeDueDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowDuePicker(false);
    }
    if (event.type === "dismissed") {
      return;
    }
    if (selected) {
      setDueAt(selected);
    }
  };

  const formatDueLabel = (iso: string | null): string | null => {
    if (!iso) {
      return null;
    }
    const date = new Date(iso);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: BRAZIL_TIME_ZONE,
    });
  };

  const getReminderOptionLabel = (value: number): string => {
    return (
      REMINDER_OPTIONS.find((option) => option.value === value)?.label ??
      "5 min antes"
    );
  };

  const saveAlert = async () => {
    if (!title.trim()) {
      Alert.alert("Título obrigatório", "Resuma o alerta em uma frase curta.");
      return;
    }

    if (highPriority && notificationPermission !== "granted") {
      const status = await requestNotificationPermission();
      setNotificationPermission(status);
      await syncSubscription(status);
      if (status !== "granted") {
        Alert.alert(
          "Ative as notificações",
          "Para alertas urgentes, ative as notificações para receber avisos importantes no momento certo."
        );
      }
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      priority: highPriority ? ("high" as const) : ("normal" as const),
      due_at: dueAt ? dueAt.toISOString() : null,
      remind_offset_minutes: remindOffsetMinutes,
      updated_at: new Date().toISOString(),
    };
    const dueAtIso = dueAt ? dueAt.toISOString() : null;
    let savedAlertId: string | null = editingId;

    if (editingId) {
      const { error } = await supabase
        .from("household_alerts")
        .update(payload)
        .eq("id", editingId)
        .eq("household_id", householdId);
      setSaving(false);
      if (error) {
        logAppError("alerts.update", error, { editingId, householdId });
        Alert.alert("Erro ao atualizar", error.message);
        return;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("household_alerts")
        .insert({
          household_id: householdId,
          created_by: userId,
          ...payload,
        })
        .select("id, title, priority")
        .single();
      setSaving(false);
      if (error) {
        logAppError("alerts.insert", error, { householdId });
        Alert.alert("Erro ao criar", error.message);
        return;
      }
      savedAlertId = inserted.id;

      if (inserted?.priority === "high") {
        try {
          await sendHouseholdPush({
            householdId,
            title: "Alerta urgente da casa",
            body: inserted.title,
            data: {
              type: "household_alert",
              alertId: inserted.id,
              householdId,
            },
            excludeUserId: userId,
          });
        } catch (error) {
          logAppError("alerts.push.highPriority", error, {
            householdId,
            alertId: inserted.id,
          });
        }
      }
    }

    if (savedAlertId) {
      try {
        await upsertAlertReminder({
          alertId: savedAlertId,
          householdId,
          userId,
          dueAtIso,
          remindOffsetMinutes,
        });
      } catch (error) {
        logAppError("alerts.reminder.upsert", error, {
          householdId,
          alertId: savedAlertId,
        });
      }
    }

    setModalOpen(false);
    resetForm();
    await loadAlerts("silent");
  };

  const confirmDelete = () => {
    if (!editingId) {
      return;
    }
    Alert.alert("Remover alerta", "Deixa de ser visível para toda a casa.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSaving(true);
            const { error } = await supabase
              .from("household_alerts")
              .delete()
              .eq("id", editingId)
              .eq("household_id", householdId);
            setSaving(false);
            if (error) {
              logAppError("alerts.delete", error, { editingId, householdId });
              Alert.alert("Erro ao remover", error.message);
              return;
            }
            setModalOpen(false);
            resetForm();
            await loadAlerts("silent");
          })();
        },
      },
    ]);
  };

  const toggleArchived = async (item: HouseholdAlertRow) => {
    const next = !item.archived;
    const { error } = await supabase
      .from("household_alerts")
      .update({
        archived: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("household_id", householdId);
    if (error) {
      logAppError("alerts.toggleArchived", error, { id: item.id, householdId });
      Alert.alert("Erro", error.message);
      return;
    }
    await loadAlerts("silent");
  };

  const handleEnableNotifications = async () => {
    setUpdatingNotificationPermission(true);
    try {
      const status = await requestNotificationPermission();
      setNotificationPermission(status);
      await syncSubscription(status);

      if (status !== "granted") {
        Alert.alert(
          "Permissão não concedida",
          "Você pode ativar as notificações nas configurações do sistema.",
          [
            { text: "Agora não", style: "cancel" },
            {
              text: "Abrir configurações",
              onPress: () => {
                void openAppNotificationSettings();
              },
            },
          ]
        );
      }
    } catch (error) {
      logAppError("alerts.notifications.requestPermission", error);
      Alert.alert(
        "Erro ao solicitar notificações",
        "Não foi possível pedir a permissão agora. Tente novamente."
      );
    } finally {
      setUpdatingNotificationPermission(false);
    }
  };

  return (
    <View style={shell.flex}>
      <View style={shell.header}>
        <Text style={[shell.headerTitle, styles.headerTitleOnly]}>Alertas</Text>
      </View>

      <Text style={[shell.mutedLine, styles.intro]}>
        Remédios, revisão do carro, renovações — o que a casa precisa lembrar
        sem depender de uma só pessoa.
      </Text>

      {notificationPermission !== "granted" ? (
        <View
          style={[
            shell.formBlock,
            styles.notificationsCallout,
            { borderColor: colors.glassBorder },
          ]}
        >
          <Text style={[shell.label, styles.notificationsTitle]}>
            Ative as notificações do app
          </Text>
          <Text style={shell.rowMeta}>
            Assim você recebe alertas importantes mesmo com o aplicativo fechado.
          </Text>
          <Pressable
            onPress={() => void handleEnableNotifications()}
            disabled={updatingNotificationPermission}
            style={({ pressed }) => [
              shell.primaryBtn,
              styles.notificationsBtn,
              pressed && styles.pressed,
              updatingNotificationPermission && shell.primaryBtnDisabled,
            ]}
          >
            <Text style={shell.primaryBtnText}>
              {updatingNotificationPermission
                ? "Solicitando..."
                : "Ativar notificações"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[shell.formBlock, styles.actionsRow]}>
        <Pressable
          onPress={openNew}
          style={({ pressed }) => [shell.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={shell.primaryBtnText}>Novo alerta</Text>
        </Pressable>
      </View>

      <View style={styles.toggleRow}>
        <Text style={shell.label}>Mostrar resolvidos</Text>
        <Switch
          value={showResolved}
          onValueChange={setShowResolved}
          trackColor={{ false: colors.glassBorder, true: colors.accent }}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          style={shell.flex}
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={shell.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadAlerts("silent")}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={shell.empty}>
              {showResolved
                ? "Sem alertas registados."
                : "Nenhum alerta ativo. Crie um quando houver algo crítico para a família."}
            </Text>
          }
          renderItem={({ item }) => {
            const resolved = item.archived;
            const urgent = item.priority === "high";
            return (
              <View
                style={[
                  shell.row,
                  resolved && styles.rowResolved,
                  urgent &&
                    !resolved && {
                      borderWidth: 1,
                      borderColor: colors.danger,
                    },
                ]}
              >
                <Pressable
                  onPress={() => void toggleArchived(item)}
                  hitSlop={10}
                  style={styles.checkHit}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: resolved }}
                >
                  <Ionicons
                    name={resolved ? "checkmark-circle" : "ellipse-outline"}
                    size={26}
                    color={resolved ? colors.accent : colors.textMuted}
                  />
                </Pressable>
                <Pressable onPress={() => openEdit(item)} style={styles.rowBody}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        shell.rowTitle,
                        resolved && styles.titleResolved,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {urgent && !resolved ? (
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: colors.pillBg,
                            borderWidth: 1,
                            borderColor: colors.danger,
                          },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: colors.danger }]}>
                          Urgente
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {resolved ? (
                    <Text style={shell.rowMeta}>Resolvido</Text>
                  ) : null}
                  {!resolved && item.due_at ? (
                    <>
                      <Text style={shell.rowMeta}>
                        Vence em {formatDueLabel(item.due_at)}
                      </Text>
                      <Text style={shell.rowMeta}>
                        Lembrete: {getReminderOptionLabel(item.remind_offset_minutes)}
                      </Text>
                    </>
                  ) : null}
                  {item.notes ? (
                    <Text style={shell.rowMeta} numberOfLines={3}>
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
            <Text style={[shell.headerTitle, styles.modalTitle]}>
              {editingId ? "Editar alerta" : "Novo alerta"}
            </Text>
            <Pressable
              onPress={() => void saveAlert()}
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
              placeholder="Ex.: Renovar seguro do carro"
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />

            <View style={styles.switchRow}>
              <Text style={shell.label}>Marcar como urgente</Text>
              <Switch
                value={highPriority}
                onValueChange={setHighPriority}
                trackColor={{ false: colors.glassBorder, true: colors.danger }}
              />
            </View>

            <Text style={shell.label}>Data e hora do alerta</Text>
            <Pressable
              onPress={() => setShowDuePicker(true)}
              style={({ pressed }) => [
                shell.secondaryPickerBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={shell.secondaryPickerBtnText}>
                {dueAt
                  ? `Vence em ${dueAt.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: BRAZIL_TIME_ZONE,
                    })}`
                  : "Definir data e hora"}
              </Text>
            </Pressable>
            {dueAt ? (
              <Pressable
                onPress={() => setDueAt(null)}
                style={({ pressed }) => [shell.ghostBtn, pressed && styles.pressed]}
              >
                <Text style={shell.ghostText}>Remover data de vencimento</Text>
              </Pressable>
            ) : null}
            {showDuePicker ? (
              <DateTimePicker
                value={dueAt ?? new Date()}
                mode="datetime"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onChangeDueDate}
                minimumDate={new Date()}
              />
            ) : null}

            <Text style={shell.label}>Lembrar</Text>
            <View style={styles.reminderOptions}>
              {REMINDER_OPTIONS.map((option) => {
                const active = remindOffsetMinutes === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setRemindOffsetMinutes(option.value)}
                    style={[
                      shell.chip,
                      active && shell.chipActive,
                      styles.reminderChip,
                    ]}
                  >
                    <Text
                      style={[
                        shell.chipText,
                        active && shell.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={shell.label}>Detalhes (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Horários, contactos, o que não pode falhar"
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
                  Remover alerta
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
  notificationsCallout: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
  },
  notificationsTitle: { marginBottom: 6 },
  notificationsBtn: { marginTop: 12 },
  actionsRow: { paddingBottom: 4 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  loader: { marginTop: 24 },
  pressed: { opacity: 0.88 },
  rowResolved: { opacity: 0.72 },
  checkHit: { marginRight: 12, alignSelf: "flex-start", paddingTop: 2 },
  rowBody: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  titleResolved: { textDecorationLine: "line-through" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 4,
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
  modalTitle: { flex: 1, textAlign: "center", fontSize: 17 },
  modalScroll: { paddingBottom: 40 },
  reminderOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  reminderChip: { marginRight: 0 },
  notesInput: { minHeight: 120, textAlignVertical: "top" },
});
