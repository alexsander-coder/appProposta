import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../context/ThemeContext";

const W = Dimensions.get("window").width;

type Props = {
  children: ReactNode;
  /**
   * Use com bottom tab navigator: o tab bar já aplica o inset inferior.
   * Sem isto, o SafeAreaView soma padding em baixo e fica uma faixa vazia.
   */
  omitBottomSafeArea?: boolean;
};

/** Fundo com gradiente e orbes, alinhado à identidade Lar em Dia (claro ou escuro). */
export function AppShell({ children, omitBottomSafeArea }: Props) {
  const { colors } = useTheme();

  const edges = omitBottomSafeArea
    ? (["top", "left", "right"] as const)
    : (["top", "left", "right", "bottom"] as const);

  return (
    <View style={[styles.root, { backgroundColor: colors.gradientTop }]}>
      <StatusBar style={colors.statusBarStyle} />
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb1,
          { backgroundColor: colors.accentGlow },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.orb2, { backgroundColor: colors.orb2 }]}
      />
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  orb1: {
    position: "absolute",
    width: W * 0.85,
    height: W * 0.85,
    borderRadius: W * 0.5,
    top: -W * 0.35,
    right: -W * 0.25,
    opacity: 0.5,
  },
  orb2: {
    position: "absolute",
    width: W * 0.55,
    height: W * 0.55,
    borderRadius: W * 0.3,
    bottom: W * 0.15,
    left: -W * 0.2,
  },
});
