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

export type ShoppingItemRow = {
  id: string;
  name: string;
  qty: string | null;
  note: string | null;
  purchased: boolean;
  purchased_at: string | null;
  purchased_by: string | null;
  created_at: string;
};

type Props = {
  householdId: string;
  userId: string;
};

function sortItems(rows: ShoppingItemRow[]): ShoppingItemRow[] {
  return [...rows].sort((a, b) => {
    if (a.purchased !== b.purchased) {
      return a.purchased ? 1 : -1;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function ShoppingListScreen({ householdId, userId }: Props) {
  const { colors } = useTheme();
  const { shell, placeholderColor } = useShellStyles();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ShoppingItemRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [quickName, setQuickName] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const sorted = useMemo(() => sortItems(items), [items]);
  const pendingCount = useMemo(
    () => items.filter((i) => !i.purchased).length,
    [items]
  );

  const loadItems = useCallback(
    async (mode: "full" | "silent" = "full") => {
      if (mode === "full") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const { data, error } = await supabase
        .from("household_shopping_items")
        .select(
          "id, name, qty, note, purchased, purchased_at, purchased_by, created_at"
        )
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });

      if (mode === "full") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
      if (error) {
        logAppError("shopping.load", error, { householdId });
        Alert.alert("Erro ao carregar lista", error.message);
        return;
      }
      setItems((data ?? []) as ShoppingItemRow[]);
    },
    [householdId]
  );

  useEffect(() => {
    void loadItems("full");
  }, [loadItems]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setQty("");
    setNote("");
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (row: ShoppingItemRow) => {
    setEditingId(row.id);
    setName(row.name);
    setQty(row.qty ?? "");
    setNote(row.note ?? "");
    setModalOpen(true);
  };

  const addQuick = async () => {
    if (!quickName.trim()) {
      Alert.alert("Nome obrigatório", "Escreva o que precisa comprar.");
      return;
    }
    const { error } = await supabase.from("household_shopping_items").insert({
      household_id: householdId,
      name: quickName.trim(),
      created_by: userId,
    });
    if (error) {
      logAppError("shopping.quickInsert", error, { householdId });
      Alert.alert("Erro ao adicionar", error.message);
      return;
    }
    setQuickName("");
    await loadItems("silent");
  };

  const saveItem = async () => {
    if (!name.trim()) {
      Alert.alert("Nome obrigatório", "Indique o produto ou item.");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      qty: qty.trim() || null,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      const { error } = await supabase
        .from("household_shopping_items")
        .update(payload)
        .eq("id", editingId)
        .eq("household_id", householdId);
      setSaving(false);
      if (error) {
        logAppError("shopping.update", error, { editingId, householdId });
        Alert.alert("Erro ao atualizar", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("household_shopping_items").insert({
        household_id: householdId,
        created_by: userId,
        ...payload,
      });
      setSaving(false);
      if (error) {
        logAppError("shopping.insert", error, { householdId });
        Alert.alert("Erro ao adicionar", error.message);
        return;
      }
    }
    setModalOpen(false);
    resetForm();
    await loadItems("silent");
  };

  const confirmDelete = () => {
    if (!editingId) {
      return;
    }
    Alert.alert("Remover item", "Este item sai da lista para todos.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSaving(true);
            const { error } = await supabase
              .from("household_shopping_items")
              .delete()
              .eq("id", editingId)
              .eq("household_id", householdId);
            setSaving(false);
            if (error) {
              logAppError("shopping.delete", error, { editingId, householdId });
              Alert.alert("Erro ao remover", error.message);
              return;
            }
            setModalOpen(false);
            resetForm();
            await loadItems("silent");
          })();
        },
      },
    ]);
  };

  const togglePurchased = async (row: ShoppingItemRow) => {
    const nowIso = new Date().toISOString();
    const next = !row.purchased;
    const { error } = await supabase
      .from("household_shopping_items")
      .update({
        purchased: next,
        purchased_at: next ? nowIso : null,
        purchased_by: next ? userId : null,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .eq("household_id", householdId);
    if (error) {
      logAppError("shopping.toggle", error, { id: row.id, householdId });
      Alert.alert("Erro", error.message);
      return;
    }
    await loadItems("silent");
  };

  const clearPurchased = () => {
    const bought = items.filter((i) => i.purchased);
    if (bought.length === 0) {
      return;
    }
    Alert.alert(
      "Limpar comprados",
      `Remover ${bought.length} item(ns) já marcados como comprados?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const ids = bought.map((i) => i.id);
              const { error } = await supabase
                .from("household_shopping_items")
                .delete()
                .eq("household_id", householdId)
                .in("id", ids);
              if (error) {
                logAppError("shopping.clearPurchased", error, { householdId });
                Alert.alert("Erro", error.message);
                return;
              }
              await loadItems("silent");
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={shell.flex}>
      <View style={shell.header}>
        <Text style={[shell.headerTitle, styles.headerTitleOnly]}>Compras</Text>
      </View>

      <Text style={[shell.mutedLine, styles.intro]}>
        Lista partilhada: quem estiver na casa vê e marca o que já foi comprado.
      </Text>

      <View style={[shell.formBlock, styles.quickBlock]}>
        <Text style={shell.label}>Adicionar rápido</Text>
        <TextInput
          value={quickName}
          onChangeText={setQuickName}
          placeholder="Ex.: leite, pão, papel higiénico"
          placeholderTextColor={placeholderColor}
          style={shell.input}
          onSubmitEditing={() => void addQuick()}
          returnKeyType="done"
        />
        <Pressable
          onPress={() => void addQuick()}
          style={({ pressed }) => [shell.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={shell.primaryBtnText}>Adicionar à lista</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <Pressable
          onPress={openNew}
          style={({ pressed }) => [shell.outlineBtn, styles.toolbarBtn, pressed && styles.pressed]}
        >
          <Text style={shell.outlineBtnText}>Detalhes (qtd / nota)</Text>
        </Pressable>
        {items.some((i) => i.purchased) ? (
          <Pressable
            onPress={clearPurchased}
            style={({ pressed }) => [shell.ghostBtn, pressed && styles.pressed]}
          >
            <Text style={shell.ghostText}>Limpar comprados</Text>
          </Pressable>
        ) : null}
      </View>

      {pendingCount > 0 ? (
        <Text style={[shell.mutedLine, styles.pendingBanner]}>
          {pendingCount} por comprar
        </Text>
      ) : null}

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
              onRefresh={() => void loadItems("silent")}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={shell.empty}>
              Lista vazia. Use o campo acima ou “Detalhes” para itens com
              quantidade.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[shell.row, item.purchased && styles.rowBought]}>
              <Pressable
                onPress={() => void togglePurchased(item)}
                hitSlop={10}
                style={styles.checkHit}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.purchased }}
              >
                <Ionicons
                  name={item.purchased ? "checkmark-circle" : "ellipse-outline"}
                  size={26}
                  color={item.purchased ? colors.accent : colors.textMuted}
                />
              </Pressable>
              <Pressable onPress={() => openEdit(item)} style={styles.rowBody}>
                <Text
                  style={[shell.rowTitle, item.purchased && styles.nameBought]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                {item.qty ? (
                  <Text style={shell.rowMeta}>{item.qty}</Text>
                ) : null}
                {item.note ? (
                  <Text style={shell.rowMeta} numberOfLines={2}>
                    {item.note}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          )}
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
              {editingId ? "Editar item" : "Novo item"}
            </Text>
            <Pressable
              onPress={() => void saveItem()}
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
              value={name}
              onChangeText={setName}
              placeholder="Produto ou item"
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />
            <Text style={shell.label}>Quantidade / embalagem (opcional)</Text>
            <TextInput
              value={qty}
              onChangeText={setQty}
              placeholder="Ex.: 2 L, 1 kg, pack 6"
              placeholderTextColor={placeholderColor}
              style={shell.input}
            />
            <Text style={shell.label}>Nota (opcional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Marca, loja, lembrete"
              placeholderTextColor={placeholderColor}
              style={[shell.input, styles.noteInput]}
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
                  Remover da lista
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
  quickBlock: { paddingBottom: 8 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  toolbarBtn: { flex: 1, paddingVertical: 12 },
  pendingBanner: {
    paddingHorizontal: 20,
    marginBottom: 4,
    fontWeight: "600",
  },
  loader: { marginTop: 24 },
  pressed: { opacity: 0.88 },
  rowBought: { opacity: 0.7 },
  checkHit: { marginRight: 12, alignSelf: "flex-start", paddingTop: 2 },
  rowBody: { flex: 1, minWidth: 0 },
  nameBought: { textDecorationLine: "line-through" },
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
  noteInput: { minHeight: 88, textAlignVertical: "top" },
});
