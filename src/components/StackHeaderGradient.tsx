import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../context/ThemeContext";

/**
 * Fundo do header nativo alinhado ao AppShell: base sólida + mesmo gradiente vertical.
 * Evita falha em alguns Android/iOS quando só há gradiente transparente.
 */
export function StackHeaderGradient() {
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.gradientTop }]}>
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
