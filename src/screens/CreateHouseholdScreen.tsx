import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppShell } from "../components/layout/AppShell";
import { useShellStyles } from "../hooks/useShellStyles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onOpenAcceptInvite?: () => void;
};

export function CreateHouseholdScreen({
  value,
  onChange,
  onSubmit,
  loading,
  onOpenAcceptInvite,
}: Props) {
  const { shell, placeholderColor } = useShellStyles();

  return (
    <AppShell>
      <KeyboardAvoidingView
        style={shell.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={shell.centeredBlock}>
          <Text style={shell.eyebrow}>Lar em Dia</Text>
          <Text style={shell.screenTitle}>Crie sua primeira casa</Text>
          <Text style={[shell.mutedLine, { lineHeight: 22, marginTop: 4 }]}>
            Este nome representa o espaco compartilhado da sua familia no app.
          </Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Ex.: Casa da Familia Souza"
            placeholderTextColor={placeholderColor}
            style={[shell.input, { marginTop: 8 }]}
          />
          <Pressable
            onPress={onSubmit}
            disabled={loading}
            style={({ pressed }) => [
              shell.primaryBtn,
              loading && shell.primaryBtnDisabled,
              pressed && !loading && styles.pressed,
            ]}
          >
            <Text style={shell.primaryBtnText}>
              {loading ? "Criando..." : "Criar casa"}
            </Text>
          </Pressable>
          {onOpenAcceptInvite ? (
            <Pressable onPress={onOpenAcceptInvite} style={shell.ghostBtn}>
              <Text style={shell.ghostText}>Ja tenho um convite</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
});
