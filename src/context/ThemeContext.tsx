import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, type ColorSchemeName } from "react-native";

import type { AppColors } from "../theme/palettes";
import { darkPalette, lightPalette } from "../theme/palettes";

const STORAGE_KEY = "lar-em-dia:theme-preference";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  resolvedScheme: "light" | "dark";
  colors: AppColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(
  preference: ThemePreference,
  system: ColorSchemeName
): "light" | "dark" {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  return system === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    () => Appearance.getColorScheme()
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          !cancelled &&
          (raw === "light" || raw === "dark" || raw === "system")
        ) {
          setPreferenceState(raw);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const resolvedScheme = resolveScheme(preference, systemScheme);

  const colors = resolvedScheme === "dark" ? darkPalette : lightPalette;

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setPreference,
      resolvedScheme,
      colors,
      isDark: resolvedScheme === "dark",
    }),
    [preference, setPreference, resolvedScheme, colors]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }
  return ctx;
}
