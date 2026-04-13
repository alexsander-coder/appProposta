import { useMemo } from "react";

import { useTheme } from "../context/ThemeContext";
import { createShellStyles } from "../theme/shellStyles";

export function useShellStyles() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      shell: createShellStyles(colors),
      placeholderColor: colors.textMuted,
    }),
    [colors]
  );
}
