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
  gradientTop: "#0A0A0C",
  gradientMid: "#131317",
  gradientBottom: "#1A1A1F",
  accent: "#C9A96A",
  accentSoft: "#E2C58D",
  accentGlow: "rgba(201, 169, 106, 0.26)",
  accentDeep: "#8D7444",
  textPrimary: "#F6F1E7",
  textSecondary: "rgba(246, 241, 231, 0.72)",
  textMuted: "rgba(246, 241, 231, 0.44)",
  glass: "rgba(255, 255, 255, 0.045)",
  glassBorder: "rgba(255, 255, 255, 0.09)",
  inputBg: "rgba(255, 255, 255, 0.06)",
  inputBorder: "rgba(255, 255, 255, 0.12)",
  inputBorderFocus: "rgba(201, 169, 106, 0.48)",
  pillBg: "rgba(255, 255, 255, 0.04)",
  danger: "#E06D6D",
  orb2: "rgba(201, 169, 106, 0.12)",
  chipActiveBg: "rgba(201, 169, 106, 0.2)",
  heroCtaPrimaryBg: "rgba(201,169,106,0.18)",
  heroCtaPrimaryBorder: "rgba(201,169,106,0.35)",
  segmentActiveBg: "rgba(255,255,255,0.1)",
  modalCardBg: "#1A1A1F",
  modalBackdrop: "rgba(8,8,10,0.72)",
  brandDotBorder: "#1A1A1F",
  brandInnerCut: "rgba(255,255,255,0.08)",
  statusBarStyle: "light",
};

export const lightPalette: AppColors = {
  gradientTop: "#F7F4EE",
  gradientMid: "#F0ECE4",
  gradientBottom: "#E8E1D4",
  accent: "#9F7A3A",
  accentSoft: "#B28B49",
  accentGlow: "rgba(159, 122, 58, 0.2)",
  accentDeep: "#7B5C2A",
  textPrimary: "#1D1A16",
  textSecondary: "rgba(29, 26, 22, 0.72)",
  textMuted: "rgba(29, 26, 22, 0.5)",
  glass: "rgba(255, 255, 255, 0.72)",
  glassBorder: "rgba(29, 26, 22, 0.1)",
  inputBg: "#FFFFFF",
  inputBorder: "rgba(29, 26, 22, 0.14)",
  inputBorderFocus: "rgba(159, 122, 58, 0.5)",
  pillBg: "rgba(29, 26, 22, 0.05)",
  danger: "#C95A5A",
  orb2: "rgba(159, 122, 58, 0.1)",
  chipActiveBg: "rgba(159, 122, 58, 0.14)",
  heroCtaPrimaryBg: "rgba(159,122,58,0.14)",
  heroCtaPrimaryBorder: "rgba(29,26,22,0.14)",
  segmentActiveBg: "rgba(159,122,58,0.12)",
  modalCardBg: "#FFFFFF",
  modalBackdrop: "rgba(29, 26, 22, 0.42)",
  brandDotBorder: "#E8E1D4",
  brandInnerCut: "rgba(0,0,0,0.1)",
  statusBarStyle: "dark",
};
