import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../services/supabase/client";
import { logAppError } from "../utils/logError";
import { useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";

type Props = {
  householdId: string;
  userId: string;
  householdName: string;
  /** Com navegação nativa, pode ser omitido (sem botão Voltar no corpo). */
  onBack?: () => void;
};

type InviteRow = { token: string; expires_at: string };

export function InviteMemberScreen({
  householdId,
  userId,
  householdName,
  onBack,
}: Props) {
  const { colors } = useTheme();
  const { shell } = useShellStyles();
  const [canInvite, setCanInvite] = useState<boolean | null>(null);
  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadRole = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("household_members")
      .select("role")
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    setLoading(false);
    if (error) {
      logAppError("invite.loadRole", error);
      Alert.alert("Erro", error.message);
      setCanInvite(false);
      return;
    }
    const ok =
      data?.role === "owner" || data?.role === "admin";
    setCanInvite(ok);
  }, [householdId, userId]);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  const createInvite = async () => {
    setCreating(true);
    const { data, error } = await supabase.rpc("create_household_invite", {
      target_household_id: householdId,
    });
    setCreating(false);

    if (error) {
      logAppError("invite.create", error, { householdId });
      Alert.alert("Erro ao criar convite", error.message);
      return;
    }

    const rows = Array.isArray(data) ? data : data != null ? [data] : [];
    const row = rows[0] as InviteRow | undefined;
    if (!row?.token) {
      Alert.alert("Erro", "Resposta vazia do servidor.");
      return;
    }
    setInvite(row);
  };

  const shareInvite = async () => {
    if (!invite) return;
    const msg = `Convite Lar em Dia — casa "${householdName}"\n\nCodigo: ${invite.token}\n\nAbra o app, faca login e use "Aceitar convite". Expira em 7 dias.`;
    try {
      await Share.share({ message: msg });
    } catch (e) {
      logAppError("invite.share", e);
    }
  };

  if (loading || canInvite === null) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!canInvite) {
    return (
      <View style={shell.centeredBlock}>
        {onBack ? (
          <Pressable onPress={onBack} style={shell.backBtn}>
            <Text style={shell.backText}>Voltar</Text>
          </Pressable>
        ) : null}
        <Text style={shell.screenTitle}>Convidar</Text>
        <Text style={[shell.mutedLine, { lineHeight: 22 }]}>
          Apenas dono ou administrador pode gerar convites.
        </Text>
      </View>
    );
  }

  return (
    <View style={[shell.flex, styles.content]}>
      {onBack ? (
        <Pressable onPress={onBack} style={shell.backBtn}>
          <Text style={shell.backText}>Voltar</Text>
        </Pressable>
      ) : null}
      <Text style={shell.screenTitle}>Convidar membro</Text>
      <Text style={[shell.mutedLine, { lineHeight: 22 }]}>
        Gere um codigo e envie para a pessoa entrar em {householdName}.
      </Text>

      {!invite ? (
        <Pressable
          onPress={() => void createInvite()}
          disabled={creating}
          style={({ pressed }) => [
            shell.primaryBtn,
            creating && shell.primaryBtnDisabled,
            pressed && !creating && styles.pressed,
          ]}
        >
          <Text style={shell.primaryBtnText}>
            {creating ? "Gerando..." : "Gerar novo codigo"}
          </Text>
        </Pressable>
      ) : (
        <>
          <Text style={shell.label}>Codigo (toque e segure para copiar)</Text>
          <Text selectable style={shell.tokenBox}>
            {invite.token}
          </Text>
          <Text style={shell.meta}>
            Valido ate: {new Date(invite.expires_at).toLocaleString("pt-BR")}
          </Text>
          <Pressable
            onPress={shareInvite}
            style={({ pressed }) => [
              shell.secondarySolidBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={shell.secondarySolidBtnText}>Compartilhar</Text>
          </Pressable>
          <Pressable onPress={() => setInvite(null)} style={shell.ghostBtn}>
            <Text style={shell.ghostText}>Gerar outro codigo</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 48,
  },
  content: { paddingHorizontal: 24, paddingTop: 12, gap: 12 },
  pressed: { opacity: 0.88 },
});
