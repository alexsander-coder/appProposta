import {
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from "../lib/supabase";

type TabNav = BottomTabNavigationProp<MainTabParamList>;

const soon = (title: string, detail: string) =>
  Alert.alert(title, `${detail}\n\nEsta área faz parte do MVP e será liberada em versões seguintes.`);

export function DashboardScreen() {
  const { colors } = useTheme();
  const { shell } = useShellStyles();
  const navigation = useNavigation<TabNav>();
  const { email, householdName, householdId } = useHousehold();
  const [statsLoading, setStatsLoading] = useState(true);
  const [documentCount, setDocumentCount] = useState(0);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const { count, error } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId);
    setStatsLoading(false);
    if (error) {
      return;
    }
    setDocumentCount(count ?? 0);
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
        Um só lugar para a rotina da família — tarefas, compras, contas, agenda
        e documentos, com visão compartilhada de quem mora junto.
      </Text>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Já disponível</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
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
        )}
      </View>

      <Text style={shell.section}>Próximo no MVP</Text>
      <Text style={[shell.mutedLine, styles.sectionHint]}>
        Estas áreas entram em sequência; por enquanto mostramos o plano para a
        casa inteira acompanhar.
      </Text>

      <PanelRow
        shell={shell}
        title="Tarefas de hoje"
        hint="Dividir e concluir o que a casa precisa"
        onPress={() => navigation.navigate("Tasks")}
      />
      <PanelRow
        shell={shell}
        title="Lista de compras"
        hint="Supermercado, farmácia, feira — lista compartilhada"
        onPress={() =>
          soon(
            "Lista de compras",
            "Itens por loja, marcar comprado em tempo real."
          )
        }
      />
      <PanelRow
        shell={shell}
        title="Contas da casa"
        hint="Água, luz, aluguel, lembretes de vencimento"
        onPress={() =>
          soon(
            "Contas da casa",
            "Vencimentos, histórico e lembretes para não atrasar."
          )
        }
      />
      <PanelRow
        shell={shell}
        title="Agenda da família"
        hint="Consultas, escola, aniversários, atividades"
        onPress={() =>
          soon(
            "Agenda da família",
            "Compromissos visíveis para quem está na casa."
          )
        }
      />
      <PanelRow
        shell={shell}
        title="Alertas importantes"
        hint="Remédios, manutenção, o que não pode passar"
        onPress={() =>
          soon("Alertas", "Lembretes cruzados com tarefas e contas.")
        }
      />
    </ScrollView>
  );
}

function PanelRow({
  shell,
  title,
  hint,
  onPress,
}: {
  shell: ReturnType<typeof useShellStyles>["shell"];
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [shell.row, styles.panelRow, pressed && styles.pressed]}
    >
      <View style={styles.panelText}>
        <Text style={shell.rowTitle}>{title}</Text>
        <Text style={shell.rowMeta}>{hint}</Text>
      </View>
      <Text style={[shell.linkText, styles.chevron]}>›</Text>
    </Pressable>
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
  docRowInner: { flex: 1 },
  chevron: { fontSize: 22, fontWeight: "300" },
  pressed: { opacity: 0.88 },
  sectionHint: { marginTop: -4, marginBottom: 8, lineHeight: 20 },
  panelRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  panelText: { flex: 1 },
});
