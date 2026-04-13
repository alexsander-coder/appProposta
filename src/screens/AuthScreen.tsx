import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase/client";
import { createAuthStyles, createBrandMarkStyles } from "../theme/createAuthStyles";
import type { AppColors } from "../theme/palettes";

type Mode = "login" | "signup";

function BrandMark({ colors }: { colors: AppColors }) {
  const markStyles = useMemo(() => createBrandMarkStyles(colors), [colors]);
  return (
    <View style={markStyles.wrap}>
      <LinearGradient
        colors={[colors.accent, colors.accentDeep, colors.accentSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={markStyles.square}
      >
        <View style={markStyles.innerCut} />
      </LinearGradient>
      <View style={markStyles.dot} />
    </View>
  );
}

const HERO_TITLE = "Tudo o que a sua casa precisa para funcionar bem, em um só app.";
const HERO_SUBTITLE =
  "Tarefas, compras, contas, agenda e documentos da casa num só lugar — para o casal ou a família inteira, com visão compartilhada e menos improviso.";

export function AuthScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createAuthStyles(colors), [colors]);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const [howModalVisible, setHowModalVisible] = useState(false);

  const isLogin = mode === "login";

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos obrigatorios", "Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    const action = isLogin
      ? supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
      : supabase.auth.signUp({
          email: email.trim(),
          password,
        });

    const { error } = await action;
    setLoading(false);

    if (error) {
      Alert.alert("Erro de autenticacao", error.message);
      return;
    }

    if (isLogin) {
      return;
    }

    Alert.alert(
      "Conta criada",
      "Verifique seu e-mail para confirmar a conta antes de entrar."
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style={colors.statusBarStyle} />
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.orb1} />
      <View pointerEvents="none" style={styles.orb2} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <BrandMark colors={colors} />
              <Text style={styles.eyebrow}>Lar em Dia</Text>
              <Text style={styles.title}>{HERO_TITLE}</Text>
              <Text style={styles.tagline}>{HERO_SUBTITLE}</Text>
              <View style={styles.heroCtas}>
                <Pressable
                  onPress={() => setMode("signup")}
                  style={({ pressed }) => [
                    styles.heroCtaPrimary,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.heroCtaPrimaryText}>Começar grátis</Text>
                </Pressable>
                <Pressable
                  onPress={() => setHowModalVisible(true)}
                  style={({ pressed }) => [
                    styles.heroCtaSecondary,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.heroCtaSecondaryText}>
                    Ver como funciona
                  </Text>
                </Pressable>
              </View>
            </View>

            <Modal
              visible={howModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setHowModalVisible(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Como funciona</Text>
                    <Pressable
                      onPress={() => setHowModalVisible(false)}
                      hitSlop={12}
                    >
                      <Text style={styles.modalDismiss}>Fechar</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.modalStep}>
                    1. Crie sua conta e a casa — um hub para a família colaborar
                    na rotina, não só uma agenda solta.
                  </Text>
                  <Text style={styles.modalStep}>
                    2. Já pode guardar documentos importantes (contratos,
                    apólices, carteirinhas). Tarefas, compras, contas e agenda
                    entram em seguida no mesmo lugar.
                  </Text>
                  <Text style={styles.modalStep}>
                    3. Convide quem mora junto: todos veem o mesmo painel e
                    deixam de depender só de WhatsApp, papel e lembrança na
                    cabeça.
                  </Text>
                  <Pressable
                    onPress={() => setHowModalVisible(false)}
                    style={styles.modalClose}
                  >
                    <Text style={styles.modalCloseText}>Entendi</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            <View style={styles.card}>
              <View style={styles.segment}>
                <Pressable
                  onPress={() => setMode("login")}
                  style={({ pressed }) => [
                    styles.segmentItem,
                    isLogin && styles.segmentItemActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.segmentText, isLogin && styles.segmentTextActive]}
                  >
                    Entrar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode("signup")}
                  style={({ pressed }) => [
                    styles.segmentItem,
                    !isLogin && styles.segmentItemActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      !isLogin && styles.segmentTextActive,
                    ]}
                  >
                    Criar conta
                  </Text>
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="nome@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  style={[
                    styles.input,
                    emailFocus && styles.inputFocused,
                  ]}
                  selectionColor={colors.accent}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Senha</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  onFocus={() => setPassFocus(true)}
                  onBlur={() => setPassFocus(false)}
                  style={[styles.input, passFocus && styles.inputFocused]}
                  selectionColor={colors.accent}
                />
              </View>

              <Pressable
                onPress={submit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.ctaOuter,
                  loading && styles.ctaDisabled,
                  pressed && !loading && styles.ctaPressed,
                ]}
              >
                <LinearGradient
                  colors={[colors.accentSoft, colors.accent, colors.accentDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>
                    {loading
                      ? "Aguarde..."
                      : isLogin
                        ? "Entrar"
                        : "Começar grátis"}
                  </Text>
                </LinearGradient>
              </Pressable>

              <Text style={styles.footnote}>
                Ao continuar, voce concorda em usar o app de forma responsavel com
                dados da sua familia.
              </Text>
            </View>

            <Text style={styles.version}>Lar em Dia · experiencia em evolucao</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
