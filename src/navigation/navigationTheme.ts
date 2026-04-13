import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";

import type { AppColors } from "../theme/palettes";

export function buildNavigationTheme(
  isDark: boolean,
  c: AppColors
): NavigationTheme {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.gradientTop,
      /** Mesma base do AppShell; `glass` aqui deixava o header nativo diferente do corpo. */
      card: c.gradientTop,
      text: c.textPrimary,
      border: c.glassBorder,
      notification: c.accent,
    },
  };
}
