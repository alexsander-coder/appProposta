/** Tokens visuais compartilhados (auth + shell + listas). */
export type AppColors = {
  gradientTop: string;
  gradientMid: string;
  gradientBottom: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  accentDeep: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glass: string;
  glassBorder: string;
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  pillBg: string;
  danger: string;
  orb2: string;
  chipActiveBg: string;
  heroCtaPrimaryBg: string;
  heroCtaPrimaryBorder: string;
  segmentActiveBg: string;
  modalCardBg: string;
  modalBackdrop: string;
  brandDotBorder: string;
  brandInnerCut: string;
  /** Conteúdo da status bar: `light` = ícones claros (fundo escuro), `dark` = ícones escuros. */
  statusBarStyle: "light" | "dark";
};

export const darkPalette: AppColors = {
  gradientTop: "#0A0C10",
  gradientMid: "#12182A",
  gradientBottom: "#0D1528",
  accent: "#4F8FFF",
  accentSoft: "#6BA3FF",
  accentGlow: "rgba(79, 143, 255, 0.35)",
  accentDeep: "#2563EB",
  textPrimary: "#F4F6FA",
  textSecondary: "rgba(244, 246, 250, 0.62)",
  textMuted: "rgba(244, 246, 250, 0.38)",
  glass: "rgba(255, 255, 255, 0.06)",
  glassBorder: "rgba(255, 255, 255, 0.1)",
  inputBg: "rgba(255, 255, 255, 0.08)",
  inputBorder: "rgba(255, 255, 255, 0.12)",
  inputBorderFocus: "rgba(79, 143, 255, 0.45)",
  pillBg: "rgba(0, 0, 0, 0.25)",
  danger: "#F87171",
  orb2: "rgba(99, 102, 241, 0.15)",
  chipActiveBg: "rgba(79, 143, 255, 0.22)",
  heroCtaPrimaryBg: "rgba(255,255,255,0.14)",
  heroCtaPrimaryBorder: "rgba(255,255,255,0.22)",
  segmentActiveBg: "rgba(255,255,255,0.12)",
  modalCardBg: "#1a2236",
  modalBackdrop: "rgba(0,0,0,0.65)",
  brandDotBorder: "#12182A",
  brandInnerCut: "rgba(0,0,0,0.2)",
  statusBarStyle: "light",
};

export const lightPalette: AppColors = {
  gradientTop: "#F5F7FB",
  gradientMid: "#EEF2FA",
  gradientBottom: "#E4EAF5",
  accent: "#3B7BED",
  accentSoft: "#4F8FFF",
  accentGlow: "rgba(59, 123, 237, 0.22)",
  accentDeep: "#2563EB",
  textPrimary: "#141820",
  textSecondary: "rgba(20, 24, 32, 0.72)",
  textMuted: "rgba(20, 24, 32, 0.45)",
  glass: "rgba(255, 255, 255, 0.78)",
  glassBorder: "rgba(20, 24, 32, 0.08)",
  inputBg: "#FFFFFF",
  inputBorder: "rgba(20, 24, 32, 0.12)",
  inputBorderFocus: "rgba(59, 123, 237, 0.55)",
  pillBg: "rgba(20, 24, 32, 0.06)",
  danger: "#DC2626",
  orb2: "rgba(59, 123, 237, 0.14)",
  chipActiveBg: "rgba(59, 123, 237, 0.18)",
  heroCtaPrimaryBg: "rgba(255,255,255,0.72)",
  heroCtaPrimaryBorder: "rgba(20, 24, 32, 0.1)",
  segmentActiveBg: "rgba(59, 123, 237, 0.14)",
  modalCardBg: "#FFFFFF",
  modalBackdrop: "rgba(20, 24, 32, 0.45)",
  brandDotBorder: "#E4EAF5",
  brandInnerCut: "rgba(0,0,0,0.12)",
  statusBarStyle: "dark",
};
