import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useShellStyles } from "../hooks/useShellStyles";

/**
 * MVP: área reservada para tarefas compartilhadas da casa (atribuir, concluir, lembretes).
 * A tabela e a API virão nas próximas iterações.
 */
export function TasksScreen() {
  const { shell } = useShellStyles();

  return (
    <ScrollView
      style={shell.flex}
      contentContainerStyle={[shell.scroll, styles.bottom]}
      showsVerticalScrollIndicator={false}
    >
      <View style={shell.header}>
        <Text style={[shell.headerTitle, styles.headerTitleOnly]}>Tarefas</Text>
      </View>

      <Text style={[shell.mutedLine, styles.lead]}>
        Aqui a família vai ver e dividir o que precisa ser feito: limpar a casa,
        pagar uma conta, buscar as crianças, levar o pet ao veterinário, e
        muito mais — com responsável e concluído para todos enxergarem.
      </Text>

      <View style={shell.glassCard}>
        <Text style={shell.cardTitle}>Em construção</Text>
        <Text style={shell.mutedLine}>
          Esta é a próxima peça central do Lar em Dia: tarefas compartilhadas
          em tempo real, ligadas à sua casa.
        </Text>
      </View>

      <Text style={shell.section}>Vai incluir</Text>
      {[
        "Lista do dia e do que está atrasado",
        "Atribuir tarefa a quem mora na casa",
        "Marcar como feito (todos veem na hora)",
        "Lembretes para não esquecer",
      ].map((line) => (
        <Text key={line} style={[shell.mutedLine, styles.bullet]}>
          • {line}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bottom: { paddingBottom: 28 },
  headerTitleOnly: { marginTop: 4 },
  lead: { lineHeight: 22, marginBottom: 8 },
  bullet: { marginBottom: 8, lineHeight: 22, paddingRight: 8 },
});
