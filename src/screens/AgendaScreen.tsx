import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";
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
import { upsertEventReminder } from "../services/eventReminders";
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
  remind_offset_minutes: number;
};

type Props = {
  householdId: string;
  userId: string;
};

const LOCALE = "pt-BR";
const REMINDER_OPTIONS = [
  { value: 0, label: "No horario" },
  { value: 5, label: "5 min antes" },
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 dia antes" },
] as const;

function getReadableTextColor(backgroundHex: string): "#FFFFFF" | "#111111" {
  const hex = backgroundHex.replace("#", "");
  if (hex.length !== 6) {
    return "#111111";
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111111" : "#FFFFFF";
}

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

function getPeriodLabel(row: HouseholdEventRow): "Manha" | "Tarde" | "Noite" {
  if (row.all_day) {
    return "Manha";
  }
  const hour = new Date(row.starts_at).getHours();
  if (hour < 12) {
    return "Manha";
  }
  if (hour < 18) {
    return "Tarde";
  }
  return "Noite";
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

export function AgendaScreen({ householdId, userId }: Props) {
  const { colors, isDark } = useTheme();
  const { shell, placeholderColor } = useShellStyles();
  const selectedDayTextColor = useMemo(
    () => getReadableTextColor(colors.accent),
    [colors.accent]
  );
  const calendarDayTextColor = isDark ? "#D8CDBA" : "#2B241A";
  const calendarHeaderTextColor = isDark ? "#A89B86" : "#6E5D40";
  const calendarDisabledTextColor = isDark ? "#5F5547" : "#B6A98F";
  const calendarMonthTextColor = isDark ? "#E8DDCA" : "#2B241A";
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
  const [remindOffsetMinutes, setRemindOffsetMinutes] = useState<number>(30);
  const [draftDate, setDraftDate] = useState(() => new Date());

  const [webDateStr, setWebDateStr] = useState(() => toWebDateStr(new Date()));
  const [webTimeStr, setWebTimeStr] = useState(() => toWebTimeStr(new Date()));

  const [iosPicker, setIosPicker] = useState<null | "date" | "time">(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const loadEvents = useCallback(
    async (mode: "full" | "silent" = "full") => {
      if (mode === "full") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();
      to.setMonth(to.getMonth() + 2);
      const { data, error } = await supabase
        .from("household_events")
        .select(
          "id, title, starts_at, ends_at, all_day, location, notes, remind_offset_minutes"
        )
        .eq("household_id", householdId)
        .gte("starts_at", from.toISOString())
        .lte("starts_at", to.toISOString())
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
    setRemindOffsetMinutes(30);
    setDraftDate(selectedDate);
    setWebDateStr(toWebDateStr(selectedDate));
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
    setRemindOffsetMinutes(row.remind_offset_minutes ?? 30);
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
      remind_offset_minutes: remindOffsetMinutes,
      updated_at: new Date().toISOString(),
    };
    let savedEventId: string | null = editingId;

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
      const { data: inserted, error } = await supabase
        .from("household_events")
        .insert({
          household_id: householdId,
          created_by: userId,
          ...payload,
        })
        .select("id")
        .single();
      setSaving(false);
      if (error) {
        logAppError("agenda.insert", error, { householdId });
        Alert.alert("Erro ao criar evento", error.message);
        return;
      }
      savedEventId = inserted?.id ?? null;
    }

    if (savedEventId) {
      try {
        await upsertEventReminder({
          eventId: savedEventId,
          householdId,
          userId,
          startsAtIso: start.toISOString(),
          remindOffsetMinutes,
        });
      } catch (error) {
        logAppError("agenda.reminder.upsert", error, {
          householdId,
          eventId: savedEventId,
        });
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

  const selectedDayKey = useMemo(
    () => localDayKey(selectedDate),
    [selectedDate]
  );

  const isSelectedToday = useMemo(() => {
    const now = new Date();
    return localDayKey(now) === selectedDayKey;
  }, [selectedDayKey]);

  const selectedDayLabel = useMemo(() => {
    const base = formatSectionLabel(selectedDayKey);
    return isSelectedToday ? `Hoje — ${base}` : base;
  }, [isSelectedToday, selectedDayKey]);

  const eventsForSelectedDay = useMemo(

    () =>
      [...events]
        .filter((ev) => localDayKey(new Date(ev.starts_at)) === selectedDayKey)
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        ),
    [events, selectedDayKey]
  );

  const selectedDayCountLabel = useMemo(() => {
    const count = eventsForSelectedDay.length;
    if (count === 0) {
      return "Nenhum evento";
    }
    return `${count} evento${count === 1 ? "" : "s"}`;
  }, [eventsForSelectedDay.length]);

  const dayListData = useMemo(() => {
    const order: Array<"Manha" | "Tarde" | "Noite"> = ["Manha", "Tarde", "Noite"];
    const grouped = new Map<"Manha" | "Tarde" | "Noite", HouseholdEventRow[]>();
    for (const period of order) {
      grouped.set(period, []);
    }
    for (const event of eventsForSelectedDay) {
      const period = getPeriodLabel(event);
      grouped.get(period)?.push(event);
    }
    const out: Array<{ type: "header"; label: string } | { type: "event"; row: HouseholdEventRow }> = [];
    for (const period of order) {
      const items = grouped.get(period) ?? [];
      if (items.length === 0) {
        continue;
      }
      out.push({ type: "header", label: period });
      for (const row of items) {
        out.push({ type: "event", row });
      }
    }
    return out;
  }, [eventsForSelectedDay]);

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      {
        marked?: boolean;
        selected?: boolean;
        selectedColor?: string;
        selectedTextColor?: string;
        dotColor?: string;
      }
    > = {};
    for (const ev of events) {
      const key = localDayKey(new Date(ev.starts_at));
      marks[key] = {
        ...(marks[key] ?? {}),
        marked: true,
        dotColor: colors.accentSoft,
      };
    }
    const selKey = selectedDayKey;
    marks[selKey] = {
      ...(marks[selKey] ?? {}),
      selected: true,
      selectedColor: colors.accent,
      selectedTextColor: selectedDayTextColor,
    };
    return marks;
  }, [
    events,
    selectedDayKey,
    colors.accent,
    colors.accentSoft,
    selectedDayTextColor,
  ]);

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

      {!loading && (
        <>
          <View style={styles.calendarWrapper}>
            <View
              style={[
                shell.glassCard,
                styles.calendarCard,
                { borderColor: colors.glassBorder },
              ]}
            >
              <Calendar
                markedDates={markedDates}
                onDayPress={(day) => {
                  const next = new Date(day.year, day.month - 1, day.day);
                  setSelectedDate(next);
                }}
                theme={{
                  calendarBackground: "transparent",
                  textSectionTitleColor: calendarHeaderTextColor,
                  selectedDayBackgroundColor: colors.accent,
                  selectedDayTextColor: selectedDayTextColor,
                  todayTextColor: colors.accent,
                  dayTextColor: calendarDayTextColor,
                  textDisabledColor: calendarDisabledTextColor,
                  monthTextColor: calendarMonthTextColor,
                  arrowColor: colors.accentSoft,
                  indicatorColor: colors.accent,
                  textDayFontWeight: "600",
                  textMonthFontWeight: "800",
                  textDayHeaderFontWeight: "700",
                  textMonthFontSize: 18,
                  textDayFontSize: 15,
                  textDayHeaderFontSize: 12,
                }}
                style={styles.calendar}
                hideExtraDays={false}
                enableSwipeMonths
              />
            </View>
          </View>
          <View
            style={[
              shell.glassCard,
              styles.daySummaryCard,
              { borderColor: colors.glassBorder },
            ]}
          >
            <View style={styles.daySummaryHeader}>
              <Text style={[styles.daySummaryTitle, { color: colors.textPrimary }]}>
                {selectedDayLabel}
              </Text>
              <View
                style={[
                  styles.dayCountChip,
                  { backgroundColor: colors.pillBg, borderColor: colors.glassBorder },
                ]}
              >
                <Text style={[styles.dayCountChipText, { color: colors.accentSoft }]}>
                  {selectedDayCountLabel}
                </Text>
              </View>
            </View>
            <Text style={[shell.rowMeta, styles.daySummaryHint]}>
              Toque em um dia no calendario para ver os compromissos daquela data.
            </Text>
          </View>
        </>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          style={shell.flex}
          data={dayListData}
          keyExtractor={(item, index) =>
            item.type === "header" ? `header-${item.label}-${index}` : item.row.id
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
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Nada marcado para este dia
              </Text>
              <Text style={shell.rowMeta}>
                Use “Novo evento” para adicionar consultas, aniversários ou
                compromissos da família.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={[shell.section, styles.periodHeader]}>{item.label}</Text>;
            }
            const event = item.row;
            return (
              <Pressable
                onPress={() => openEdit(event)}
                style={({ pressed }) => [
                  shell.row,
                  styles.eventCard,
                  { borderLeftColor: colors.accent },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.eventTopRow}>
                  <Text style={shell.rowTitle}>{event.title}</Text>
                  {event.all_day ? (
                    <View
                      style={[
                        styles.allDayBadge,
                        { borderColor: colors.glassBorder, backgroundColor: colors.pillBg },
                      ]}
                    >
                      <Text style={[styles.allDayBadgeText, { color: colors.accentSoft }]}>
                        Dia inteiro
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.eventMetaRow}>
                  <Ionicons name="time-outline" size={14} color={colors.accentSoft} />
                  <Text style={[shell.rowMeta, styles.eventTime, { color: colors.accentSoft }]}>
                    {formatEventSubtitle(event)}
                  </Text>
                </View>
                {event.location ? (
                  <View style={styles.eventMetaRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                    <Text style={shell.rowMeta}>{event.location}</Text>
                  </View>
                ) : null}
              <View style={styles.eventMetaRow}>
                <Ionicons name="notifications-outline" size={14} color={colors.textMuted} />
                <Text style={shell.rowMeta}>
                  Lembrete: {REMINDER_OPTIONS.find((r) => r.value === event.remind_offset_minutes)?.label ?? "30 min antes"}
                </Text>
              </View>
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
                    <Text style={[shell.chipText, active && shell.chipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

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
  calendarWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  calendarCard: {
    marginTop: 0,
    padding: 12,
    borderRadius: 24,
  },
  calendar: {
    borderRadius: 18,
  },
  daySummaryCard: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 2,
    paddingTop: 16,
    paddingBottom: 16,
  },
  daySummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  daySummaryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  daySummaryHint: {
    marginTop: 8,
  },
  dayCountChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dayCountChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  eventCard: {
    borderLeftWidth: 3,
  },
  periodHeader: {
    marginTop: 4,
    marginBottom: 2,
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  allDayBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  allDayBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  eventMetaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventTime: { marginTop: 0 },
  emptyBlock: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 18,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
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
  timeBtn: { marginTop: 10 },
  reminderOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  reminderChip: { marginRight: 0 },
  notesInput: { minHeight: 100, textAlignVertical: "top" },
  iosPickerRoot: { flex: 1, justifyContent: "flex-end" },
  iosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,10,0.52)",
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
