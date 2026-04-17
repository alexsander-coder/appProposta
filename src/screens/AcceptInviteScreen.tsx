import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../services/supabase/client";
import { logAppError } from "../utils/logError";
import { useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";

type Props = {
  onSuccess: () => void | Promise<void>;
  onBack?: () => void;
};

export function AcceptInviteScreen({ onSuccess, onBack }: Props) {
  const { shell, placeholderColor } = useShellStyles();
  const { colors } = useTheme();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const t = token.trim();
    if (!t) {
      Alert.alert("Codigo obrigatorio", "Cole o codigo de convite.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc("accept_household_invite", {
      invite_token: t,
    });

    
    setLoading(false);

    if (error) {
      logAppError("invite.accept", error, { tokenLen: t.length });
      const low = error.message.toLowerCase();
      Alert.alert(
        "Convite invalido",
        low.includes("invalid") || low.includes("expired")
          ? "Codigo invalido ou expirado. Solicite um novo codigo ao administrador."
          : error.message
      );
      return;
    }

    setToken("");
    await onSuccess();
    Alert.alert("Bem-vindo", "Voce entrou na casa com sucesso.");
  };

  return (
    <KeyboardAvoidingView
      style={shell.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={shell.centeredBlock}>
        {onBack ? (
          <Pressable onPress={onBack} style={shell.backBtn}>
            <Text style={shell.backText}>Voltar</Text>
          </Pressable>
        ) : null}
        <Text style={shell.screenTitle}>Aceitar convite</Text>
        <Text style={[shell.mutedLine, { lineHeight: 22 }]}>
          Cole o codigo que o administrador da casa compartilhou com voce.
          Voce precisa estar logado nesta conta.
        </Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Codigo do convite"
          placeholderTextColor={placeholderColor}
          autoCapitalize="none"
          autoCorrect={false}
          style={shell.input}
        />
        <Pressable
          onPress={() => void submit()}
          disabled={loading}
          style={({ pressed }) => [
            shell.primaryBtn,
            loading && shell.primaryBtnDisabled,
            pressed && !loading && styles.pressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={shell.primaryBtnText}>Entrar na casa</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
});
