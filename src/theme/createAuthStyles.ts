import { Dimensions, Platform, StyleSheet } from "react-native";

import type { AppColors } from "./palettes";

const W = Dimensions.get("window").width;

export function createAuthStyles(c: AppColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.gradientTop,
    },
    safe: {
      flex: 1,
      backgroundColor: "transparent",
    },
    flex: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 40,
    },
    orb1: {
      position: "absolute",
      width: W * 0.85,
      height: W * 0.85,
      borderRadius: W * 0.5,
      backgroundColor: c.accentGlow,
      top: -W * 0.35,
      right: -W * 0.25,
      opacity: 0.5,
    },
    orb2: {
      position: "absolute",
      width: W * 0.55,
      height: W * 0.55,
      borderRadius: W * 0.3,
      backgroundColor: c.orb2,
      bottom: W * 0.15,
      left: -W * 0.2,
    },
    hero: {
      marginBottom: 28,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 2.2,
      textTransform: "uppercase",
      color: c.textMuted,
      marginBottom: 8,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.6,
      lineHeight: 32,
      color: c.textPrimary,
      marginBottom: 14,
    },
    tagline: {
      fontSize: 15,
      lineHeight: 22,
      color: c.textSecondary,
      maxWidth: 400,
      fontWeight: "400",
    },
    heroCtas: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 22,
    },
    heroCtaPrimary: {
      backgroundColor: c.heroCtaPrimaryBg,
      paddingVertical: 14,
      paddingHorizontal: 22,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.heroCtaPrimaryBorder,
    },
    heroCtaPrimaryText: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    heroCtaSecondary: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      justifyContent: "center",
    },
    heroCtaSecondaryText: {
      color: c.accentSoft,
      fontSize: 15,
      fontWeight: "700",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: c.modalBackdrop,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: c.modalCardBg,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: c.glassBorder,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 16,
    },
    modalTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: "800",
      color: c.textPrimary,
    },
    modalDismiss: {
      fontSize: 15,
      fontWeight: "600",
      color: c.textMuted,
    },
    modalStep: {
      fontSize: 15,
      lineHeight: 22,
      color: c.textSecondary,
      marginBottom: 12,
    },
    modalClose: {
      marginTop: 8,
      alignSelf: "flex-start",
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    modalCloseText: {
      color: c.accentSoft,
      fontSize: 16,
      fontWeight: "700",
    },
    card: {
      borderRadius: 22,
      padding: 22,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      overflow: "hidden",
    },
    segment: {
      flexDirection: "row",
      backgroundColor: c.pillBg,
      borderRadius: 14,
      padding: 4,
      marginBottom: 22,
    },
    segmentItem: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: 11,
    },
    segmentItemActive: {
      backgroundColor: c.segmentActiveBg,
    },
    segmentText: {
      fontSize: 15,
      fontWeight: "600",
      color: c.textMuted,
    },
    segmentTextActive: {
      color: c.textPrimary,
    },
    pressed: {
      opacity: 0.92,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
      marginBottom: 8,
      marginLeft: 2,
    },
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === "ios" ? 16 : 14,
      fontSize: 16,
      color: c.textPrimary,
      fontWeight: "500",
    },
    inputFocused: {
      borderColor: c.inputBorderFocus,
    },
    ctaOuter: {
      marginTop: 8,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 10,
    },
    ctaGradient: {
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    ctaText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    ctaDisabled: {
      opacity: 0.55,
    },
    ctaPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    footnote: {
      marginTop: 18,
      fontSize: 12,
      lineHeight: 17,
      color: c.textMuted,
      textAlign: "center",
    },
    version: {
      marginTop: 28,
      textAlign: "center",
      fontSize: 11,
      color: c.textMuted,
      letterSpacing: 0.4,
    },
  });
}

export function createBrandMarkStyles(c: AppColors) {
  return StyleSheet.create({
    wrap: {
      width: 56,
      height: 56,
      marginBottom: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    square: {
      width: 48,
      height: 48,
      borderRadius: 14,
      transform: [{ rotate: "-8deg" }],
      justifyContent: "center",
      alignItems: "center",
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
      elevation: 12,
    },
    innerCut: {
      width: 18,
      height: 18,
      borderRadius: 5,
      backgroundColor: c.brandInnerCut,
    },
    dot: {
      position: "absolute",
      right: 4,
      top: 4,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.accentSoft,
      borderWidth: 2,
      borderColor: c.brandDotBorder,
    },
  });
}
