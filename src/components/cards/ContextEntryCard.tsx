import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { useShellStyles } from "../../hooks/useShellStyles";

type Props = {
  title: string;
  description: string;
  meta: string;
  count: string;
  borderColor: string;
  onPress: () => void;
};

export function ContextEntryCard({
  title,
  description,
  meta,
  count,
  borderColor,
  onPress,
}: Props) {
  const { shell } = useShellStyles();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        shell.row,
        styles.card,
        { borderColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardText}>
        <View style={styles.cardHeader}>
          <Text style={shell.rowTitle}>{title}</Text>
          <View
            style={[
              styles.badge,
              { borderColor: colors.inputBorderFocus, backgroundColor: colors.heroCtaPrimaryBg },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.textPrimary }]}>{count}</Text>
          </View>
        </View>
        <Text style={shell.rowMeta}>{description}</Text>
        <Text style={[shell.linkText, styles.meta]}>{meta}</Text>
      </View>
      <Text style={[shell.linkText, styles.chevron]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  cardText: { flex: 1 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  badge: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  meta: { marginTop: 10 },
  chevron: { fontSize: 22, fontWeight: "300" },
  pressed: { opacity: 0.88 },
});
