import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

export type HouseholdEventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
};

type Props = {
  householdId: string;
  userId: string;
};

type SectionBlock = { dayKey: string; label: string; events: HouseholdEventRow[] };

const LOCALE = "pt-BR";

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatSectionLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatEventSubtitle(row: HouseholdEventRow): string {
  const start = new Date(row.starts_at);
  if (row.all_day) {
    return "Dia inteiro";
  }
  return start.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

function toWebDateStr(d: Date): string {
  return localDayKey(d);
}

function toWebTimeStr(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function parseWebDateTime(
  dateStr: string,
  timeStr: string,
  allDay: boolean
): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!dm) {
    return null;
  }
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  if (!allDay) {
    const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
    if (!tm) {
      return null;
    }
    const hh = Number(tm[1]);
    const mm = Number(tm[2]);
    if (hh > 23 || mm > 59) {
      return null;
    }
    return new Date(y, mo - 1, d, hh, mm, 0, 0);
  }
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

function buildSections(rows: HouseholdEventRow[]): SectionBlock[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
  const map = new Map<string, HouseholdEventRow[]>();
  for (const row of sorted) {
    const key = localDayKey(new Date(row.starts_at));
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([dayKey, events]) => ({
    dayKey,
    label: formatSectionLabel(dayKey),
    events,
  }));
}

export function AgendaScreen({ householdId, userId }: Props) {
  const { colors } = useTheme();
  const { shell, placeholderColor } = useShellStyles();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<HouseholdEventRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [draftDate, setDraftDate] = useState(() => new Date());

  const [webDateStr, setWebDateStr] = useState(() => toWebDateStr(new Date()));
  const [webTimeStr, setWebTimeStr] = useState(() => toWebTimeStr(new Date()));

  const [iosPicker, setIosPicker] = useState<null | "date" | "time">(null);

  const sections = useMemo(() => buildSections(events), [events]);

  const loadEvents = useCallback(
    async (mode: "full" | "silent" = "full") => {
      if (mode === "full") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const from = new Date();
      from.setDate(from.getDate() - 1);
      const { data, error } = await supabase
        .from("household_events")
        .select("id, title, starts_at, ends_at, all_day, location, notes")
        .eq("household_id", householdId)
        .gte("starts_at", from.toISOString())
        .order("starts_at", { ascending: true });

      if (mode === "full") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
      if (error) {
        logAppError("agenda.load", error, { householdId });
        Alert.alert("Erro ao carregar agenda", error.message);
        return;
      }
      setEvents((data ?? []) as HouseholdEventRow[]);
    },
    [householdId]
  );

  useEffect(() => {
    void loadEvents("full");
  }, [loadEvents]);

  const resetForm = () => {
    const now = new Date();
    setEditingId(null);
    setTitle("");
    setNotes("");
    setLocation("");
    setAllDay(false);
    setDraftDate(now);
    setWebDateStr(toWebDateStr(now));
    setWebTimeStr(toWebTimeStr(now));
    setIosPicker(null);
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (row: HouseholdEventRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setNotes(row.notes ?? "");
    setLocation(row.location ?? "");
    setAllDay(row.all_day);
    const d = new Date(row.starts_at);
    setDraftDate(d);
    setWebDateStr(toWebDateStr(d));
    setWebTimeStr(toWebTimeStr(d));
    setIosPicker(null);
    setModalOpen(true);
  };

  const pickDateAndroid = () => {
    DateTimePickerAndroid.open({
      value: draftDate,
      mode: "date",
      is24Hour: true,
      onChange: (e, date) => {
        if (e.type !== "set" || !date) {
          return;
        }
        setDraftDate((prev) => {
          const next = new Date(prev);
          next.setFullYear(date.getFullYear());
          next.setMonth(date.getMonth());
          next.setDate(date.getDate());
          return next;
        });
      },
    });
  };

  const pickTimeAndroid = () => {
    DateTimePickerAndroid.open({
      value: draftDate,
      mode: "time",
      is24Hour: true,
      onChange: (e, date) => {
        if (e.type !== "set" || !date) {
          return;
        }
        setDraftDate((prev) => {
          const next = new Date(prev);
          next.setHours(date.getHours());
          next.setMinutes(date.getMinutes());
          next.setSeconds(0);
          next.setMilliseconds(0);
          return next;
        });
      },
    });
  };

  const resolveStartDate = (): Date | null => {
    if (Platform.OS === "web") {
      return parseWebDateTime(webDateStr, webTimeStr, allDay);
    }
    if (allDay) {
      const d = new Date(draftDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return new Date(draftDate);
  };

  const saveEvent = async () => {
    if (!title.trim()) {
      Alert.alert("Título obrigatório", "Dê um nome ao compromisso.");
      return;
    }
    const start = resolveStartDate();
    if (!start) {
      Alert.alert(
        "Data inválida",
        Platform.OS === "web"
          ? "Use a data no formato AAAA-MM-DD e a hora HH:MM."
          : "Ajuste data e hora do evento."
      );
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      starts_at: start.toISOString(),
      ends_at: null as string | null,
      all_day: allDay,
      location: location.trim() || null,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("household_events")
        .update(payload)
        .eq("id", editingId)
        .eq("household_id", householdId);
      setSaving(false);
      if (error) {
        logAppError("agenda.update", error, { editingId, householdId });
        Alert.alert("Erro ao atualizar", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("household_events").insert({
        household_id: householdId,
        created_by: userId,
        ...payload,
      });
      setSaving(false);
      if (error) {
        logAppError("agenda.insert", error, { householdId });
        Alert.alert("Erro ao criar evento", error.message);
        return;
      }
    }

    setModalOpen(false);
    resetForm();
    await loadEvents("silent");
  };

  const confirmDelete = () => {
    if (!editingId) {
      return;
    }
    Alert.alert(
      "Remover evento",
      "Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setSaving(true);
              const { error } = await supabase
                .from("household_events")
                .delete()
                .eq("id", editingId)
                .eq("household_id", householdId);
              setSaving(false);
              if (error) {
                logAppError("agenda.delete", error, { editingId, householdId });
                Alert.alert("Erro ao remover", error.message);
                return;
              }
              setModalOpen(false);
              resetForm();
              await loadEvents("silent");
            })();
          },
        },
      ]
    );
  };

  const listData = useMemo(() => {
    const out: ({ type: "header"; label: string } | { type: "row"; event: HouseholdEventRow })[] =
      [];
    for (const block of sections) {
      out.push({ type: "header", label: block.label });
      for (const ev of block.events) {
        out.push({ type: "row", event: ev });
      }
    }
    return out;
  }, [sections]);

  return (
    <View style={shell.flex}>
      <View style={shell.header}>
        <Text style={[shell.headerTitle, styles.headerTitleOnly]}>Agenda</Text>
      </View>

      <Text style={[shell.mutedLine, styles.intro]}>
        Consultas, escola, aniversários e reuniões da família — visíveis para
        quem está na casa.
      </Text>

      <View style={[shell.formBlock, styles.actionsRow]}>
        <Pressable
          onPress={openNew}
          style={({ pressed }) => [shell.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={shell.primaryBtnText}>Novo evento</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          style={shell.flex}
          data={listData}
          keyExtractor={(item, index) =>
            item.type === "header" ? `h-${item.label}-${index}` : item.event.id
          }
          contentContainerStyle={shell.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadEvents("silent")}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={shell.empty}>
              Nenhum evento nos próximos dias. Toque em “Novo evento”.
            </Text>
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Text style={[shell.section, styles.sectionHeader]}>
                  {item.label}
                </Text>
              );
            }
            return (
              <Pressable
                onPress={() => openEdit(item.event)}
                style={({ pressed }) => [shell.row, pressed && styles.pressed]}
              >
                <Text style={shell.rowTitle}>{item.event.title}</Text>
                <Text style={shell.rowMeta}>{formatEventSubtitle(item.event)}</Text>
                {item.event.location ? (
                  <Text style={shell.rowMeta}>{item.event.location}</Text>
                ) : null}
              </Pressable>
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
              <Text style={[shell.ghostText, { color: colors.accentSoft }]}>
                Cancelar
              </Text>
            </Pressable>
            <Text style={[shell.headerTitle, styles.modalTitle]}>Evento</Text>
            <Pressable
              onPress={() => void saveEvent()}
              disabled={saving}
              style={styles.modalHeaderBtn}
            >
              <Text
                style={[
                  shell.linkText,
                  { opacity: saving ? 0.5 : 1 },
                ]}
              >
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
              placeholder="Ex.: Pediatra — consulta de rotina"
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />

            <View style={styles.switchRow}>
              <Text style={shell.label}>Dia inteiro</Text>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ false: colors.glassBorder, true: colors.accent }}
              />
            </View>

            {Platform.OS === "web" ? (
              <>
                <Text style={shell.label}>Data (AAAA-MM-DD)</Text>
                <TextInput
                  value={webDateStr}
                  onChangeText={setWebDateStr}
                  placeholder="2026-04-20"
                  placeholderTextColor={placeholderColor}
                  style={shell.input}
                  autoCapitalize="none"
                />
                {!allDay ? (
                  <>
                    <Text style={shell.label}>Hora (HH:MM)</Text>
                    <TextInput
                      value={webTimeStr}
                      onChangeText={setWebTimeStr}
                      placeholder="14:30"
                      placeholderTextColor={placeholderColor}
                      style={shell.input}
                      autoCapitalize="none"
                    />
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    if (Platform.OS === "android") {
                      pickDateAndroid();
                    } else {
                      setIosPicker("date");
                    }
                  }}
                  style={({ pressed }) => [shell.outlineBtn, pressed && styles.pressed]}
                >
                  <Text style={shell.outlineBtnText}>
                    Data:{" "}
                    {draftDate.toLocaleDateString(LOCALE, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </Pressable>
                {!allDay ? (
                  <Pressable
                    onPress={() => {
                      if (Platform.OS === "android") {
                        pickTimeAndroid();
                      } else {
                        setIosPicker("time");
                      }
                    }}
                    style={({ pressed }) => [
                      shell.secondarySolidBtn,
                      pressed && styles.pressed,
                      styles.timeBtn,
                    ]}
                  >
                    <Text style={shell.secondarySolidBtnText}>
                      Hora: {toWebTimeStr(draftDate)}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}

            <Text style={shell.label}>Local (opcional)</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Hospital, escola, endereço..."
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />

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
                  Remover evento
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>

          {Platform.OS === "ios" && iosPicker ? (
            <Modal transparent visible animationType="fade">
              <View style={styles.iosPickerRoot}>
                <Pressable
                  style={styles.iosOverlay}
                  onPress={() => setIosPicker(null)}
                />
                <View
                  style={[
                    styles.iosSheet,
                    { backgroundColor: colors.inputBg, borderColor: colors.glassBorder },
                  ]}
                >
                  <DateTimePicker
                    value={draftDate}
                    mode={iosPicker}
                    display="spinner"
                    locale={LOCALE}
                    onChange={(_, date) => {
                      if (date) {
                        setDraftDate(date);
                      }
                    }}
                  />
                  <Pressable
                    onPress={() => setIosPicker(null)}
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
  sectionHeader: { marginTop: 8, marginBottom: 6 },
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
  timeBtn: { marginTop: 10 },
  notesInput: { minHeight: 100, textAlignVertical: "top" },
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
});
