import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { THEME_OPTIONS, useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";

export function ThemeSettingsScreen() {
  const { preference, setPreference } = useTheme();
  const { shell } = useShellStyles();

  return (
    <ScrollView
      style={shell.flex}
      contentContainerStyle={shell.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={shell.screenTitle}>Aparência</Text>
      <Text style={[shell.mutedLine, styles.hint]}>
        Escolha um tema fixo ou acompanhe o modo claro ou escuro do sistema.
      </Text>

      <View style={styles.options}>
        {THEME_OPTIONS.map(({ value, label }) => {
          const active = preference === value;
          return (
            <Pressable
              key={value}
              onPress={() => setPreference(value)}
              style={({ pressed }) => [
                shell.chip,
                styles.optionChip,
                active && shell.chipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  shell.chipText,
                  active && shell.chipTextActive,
                  styles.optionLabel,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: 8, lineHeight: 22 },
  options: { marginTop: 16, gap: 10 },
  optionChip: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  optionLabel: { fontSize: 16 },
  pressed: { opacity: 0.88 },
});
