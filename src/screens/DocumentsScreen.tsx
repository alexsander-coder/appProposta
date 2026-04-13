import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  InteractionManager,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DOCUMENTS_STORAGE_BUCKET } from "../config/storage";
import { formatFileSize, MAX_UPLOAD_BYTES } from "../config/upload";
import { supabase } from "../services/supabase/client";
import { logAppError } from "../utils/logError";
import { randomUUID } from "../utils/uuid";
import { useTheme } from "../context/ThemeContext";
import { useShellStyles } from "../hooks/useShellStyles";

export type DocumentRow = {
  id: string;
  title: string;
  category: string;
  storage_path: string;
  mime_type: string | null;
  entity_id: string | null;
};

type Props = {
  householdId: string;
  userId: string;
  onBack?: () => void;
};

function sanitizeFileName(name: string) {
  return name.replace(/[/\\]/g, "_").slice(0, 200) || "arquivo";
}

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = globalThis.atob(base64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

/** Android content:// e iOS file://: ler via FileSystem. Web: fetch + arrayBuffer. */
async function readPickedFile(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const buf = await response.arrayBuffer();
    return new Uint8Array(buf);
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToUint8Array(base64);
}

export function DocumentsScreen({ householdId, userId, onBack }: Props) {
  const { colors } = useTheme();
  const { shell, placeholderColor } = useShellStyles();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("geral");
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, category, storage_path, mime_type, entity_id")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      logAppError("documents.load", error, { householdId });
      Alert.alert("Erro ao carregar documentos", error.message);
      return;
    }
    setDocs((data ?? []) as DocumentRow[]);
  }, [householdId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const waitForPickerReady = () =>
    new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(resolve, 120);
      });
    });

  const uploadAfterPick = async (
    uri: string,
    rawName: string,
    mimeType: string,
    reportedSizeBytes: number | null
  ) => {
    if (
      reportedSizeBytes != null &&
      reportedSizeBytes > MAX_UPLOAD_BYTES
    ) {
      logAppError("documents.sizeLimit.reported", "Excede limite (metadado)", {
        reportedSizeBytes,
        maxBytes: MAX_UPLOAD_BYTES,
      });
      Alert.alert(
        "Arquivo grande demais",
        `Limite: ${formatFileSize(MAX_UPLOAD_BYTES)} por arquivo.\n\nEste arquivo: ${formatFileSize(
          reportedSizeBytes
        )}.\n\nReduza o tamanho ou use um PDF/imagem menor.`
      );
      return;
    }

    const fileName = sanitizeFileName(rawName);
    const docId = randomUUID();
    const storagePath = `${householdId}/${docId}/${fileName}`;

    setUploading(true);

    let bytes: Uint8Array;
    try {
      bytes = await readPickedFile(uri);
    } catch (e) {
      setUploading(false);
      const msg = e instanceof Error ? e.message : "Falha ao ler arquivo";
      logAppError("documents.readFile", e, {
        bucket: DOCUMENTS_STORAGE_BUCKET,
        storagePath,
      });
      Alert.alert("Erro no upload", msg);
      return;
    }

    if (bytes.length > MAX_UPLOAD_BYTES) {
      setUploading(false);
      logAppError("documents.sizeLimit.actual", "Excede limite (apos leitura)", {
        actualBytes: bytes.length,
        maxBytes: MAX_UPLOAD_BYTES,
      });
      Alert.alert(
        "Arquivo grande demais",
        `Limite: ${formatFileSize(MAX_UPLOAD_BYTES)} por arquivo.\n\nEste arquivo: ${formatFileSize(
          bytes.length
        )}.`
      );
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("documents")
      .insert({
        id: docId,
        household_id: householdId,
        entity_id: null,
        category: category.trim() || "geral",
        title: title.trim(),
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: bytes.length,
        created_by: userId,
      })
      .select("id")
      .single();

    if (insertError) {
      setUploading(false);
      logAppError("documents.insert", insertError, {
        householdId,
        storagePath,
        docId,
      });
      Alert.alert("Erro ao registrar documento", insertError.message);
      return;
    }

    const { error: upError } = await supabase.storage
      .from(DOCUMENTS_STORAGE_BUCKET)
      .upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (upError) {
      await supabase.from("documents").delete().eq("id", inserted.id);
      const raw = upError.message ?? "";
      const hint =
        /bucket not found|not found/i.test(raw)
          ? ` Crie o bucket "${DOCUMENTS_STORAGE_BUCKET}" em Storage no painel Supabase (privado), ou defina EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET no .env.`
          : "";
      logAppError("documents.storage.upload", upError, {
        bucket: DOCUMENTS_STORAGE_BUCKET,
        storagePath,
        docId: inserted.id,
        hintShown: Boolean(hint),
      });
      Alert.alert("Erro no upload", `${raw}${hint}`);
      setUploading(false);
      return;
    }

    setUploading(false);
    setTitle("");
    setCategory("geral");
    await loadDocs();
    Alert.alert("Sucesso", "Documento enviado.");
  };

  const pickFromFiles = async () => {
    if (!title.trim()) {
      Alert.alert("Titulo obrigatorio", "Informe um titulo para o documento.");
      return;
    }

    await waitForPickerReady();

    let picked: DocumentPicker.DocumentPickerResult;
    try {
      // */* evita bugs em alguns Androids com EXTRA_MIME_TYPES + lista mista
      picked = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao abrir seletor";
      logAppError("documents.picker", e);
      Alert.alert("Arquivos", msg);
      return;
    }

    if (picked.canceled) {
      Alert.alert(
        "Selecao cancelada",
        "Nenhum arquivo foi confirmado. Toque de novo para tentar."
      );
      return;
    }

    if (!picked.assets?.length) {
      logAppError("documents.picker.emptyAssets", "Sem assets no retorno", {
        picked: JSON.stringify(picked).slice(0, 500),
      });
      Alert.alert(
        "Arquivo nao recebido",
        `Resposta inesperada do sistema. Tente "Foto da galeria" ou outro app de arquivos.\n\nDebug: ${JSON.stringify(
          picked
        ).slice(0, 400)}`
      );
      return;
    }

    const asset = picked.assets[0];
    const rawName = asset.name ?? "documento";
    const mimeType = asset.mimeType ?? "application/octet-stream";
    const sizeBytes =
      typeof asset.size === "number" ? asset.size : null;

    await uploadAfterPick(asset.uri, rawName, mimeType, sizeBytes);
  };

  const pickFromGallery = async () => {
    if (!title.trim()) {
      Alert.alert("Titulo obrigatorio", "Informe um titulo para o documento.");
      return;
    }

    await waitForPickerReady();

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permissao",
        "Precisamos de acesso a fotos para escolher uma imagem da galeria."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets?.length) {
      Alert.alert(
        "Selecao cancelada",
        "Nenhuma foto foi escolhida. Toque de novo para tentar."
      );
      return;
    }

    const a = result.assets[0];
    const mimeType = a.mimeType ?? "image/jpeg";
    const rawName =
      a.fileName ?? `imagem_${Date.now()}.${mimeType.includes("png") ? "png" : "jpg"}`;
    const sizeBytes =
      typeof a.fileSize === "number" ? a.fileSize : null;

    await uploadAfterPick(a.uri, rawName, mimeType, sizeBytes);
  };

  const openDocument = async (doc: DocumentRow) => {
    setOpeningId(doc.id);
    const { data: signed, error: signError } = await supabase.storage
      .from(DOCUMENTS_STORAGE_BUCKET)
      .createSignedUrl(doc.storage_path, 120);

    if (signError || !signed?.signedUrl) {
      setOpeningId(null);
      logAppError("documents.storage.signedUrl", signError ?? "Sem URL", {
        bucket: DOCUMENTS_STORAGE_BUCKET,
        storage_path: doc.storage_path,
        documentId: doc.id,
      });
      Alert.alert("Erro ao gerar link", signError?.message ?? "Sem URL");
      return;
    }

    await supabase.from("document_access_logs").insert({
      document_id: doc.id,
      household_id: householdId,
      user_id: userId,
      action: "view",
    });

    setOpeningId(null);
    const canOpen = await Linking.canOpenURL(signed.signedUrl);
    if (canOpen) {
      await Linking.openURL(signed.signedUrl);
    } else {
      logAppError("documents.openUrl", "Linking.canOpenURL false", {
        url: signed.signedUrl,
      });
      Alert.alert("Nao foi possivel abrir", signed.signedUrl);
    }
  };

  return (
    <View style={shell.flex}>
        <View style={shell.header}>
          {onBack ? (
            <Pressable onPress={onBack} style={shell.backBtn}>
              <Text style={shell.backText}>Voltar</Text>
            </Pressable>
          ) : null}
          <Text style={[shell.headerTitle, !onBack && styles.headerTitleOnly]}>
            Documentos
          </Text>
        </View>

        <Text style={[shell.mutedLine, styles.docIntro]}>
          Contratos, apólices, carteirinhas, garantias e outros arquivos
          importantes da casa — organizados e acessíveis para a família.
        </Text>

        <View style={shell.formBlock}>
          <Text style={shell.label}>Titulo</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Carteirinha do plano"
            placeholderTextColor={placeholderColor}
            style={shell.input}
          />
          <Text style={shell.label}>Categoria</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="saude, escola, veiculo..."
            placeholderTextColor={placeholderColor}
            style={shell.input}
          />
          <Pressable
            onPress={() => {
              void pickFromFiles().catch((e) => {
                logAppError("documents.pickFromFiles.unhandled", e);
                Alert.alert(
                  "Erro",
                  e instanceof Error ? e.message : String(e)
                );
              });
            }}
            disabled={uploading}
            style={({ pressed }) => [
              shell.secondarySolidBtn,
              uploading && shell.primaryBtnDisabled,
              pressed && !uploading && styles.pressed,
            ]}
          >
            <Text style={shell.secondarySolidBtnText}>
              {uploading ? "Enviando..." : "Arquivo (qualquer tipo)"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void pickFromGallery().catch((e) => {
                logAppError("documents.pickFromGallery.unhandled", e);
                Alert.alert(
                  "Erro",
                  e instanceof Error ? e.message : String(e)
                );
              });
            }}
            disabled={uploading}
            style={({ pressed }) => [
              shell.secondaryPickerBtn,
              uploading && shell.primaryBtnDisabled,
              pressed && !uploading && styles.pressed,
            ]}
          >
            <Text style={shell.secondaryPickerBtnText}>Foto da galeria</Text>
          </Pressable>
          <Text style={shell.hint}>
            Limite por envio: {formatFileSize(MAX_UPLOAD_BYTES)}. Se "Arquivo"
            nao responder, use "Foto da galeria" para imagens.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.accent}
            style={styles.loader}
          />
        ) : (
          <FlatList
            style={shell.flex}
            data={docs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={shell.listContent}
            ListEmptyComponent={
              <Text style={shell.empty}>Nenhum documento ainda.</Text>
            }
            renderItem={({ item }) => (
                <View style={shell.row}>
                  <Text style={shell.rowTitle}>{item.title}</Text>
                  <Text style={shell.rowMeta}>{item.category}</Text>
                  <Pressable
                    onPress={() => openDocument(item)}
                    disabled={openingId === item.id}
                    style={shell.linkBtn}
                  >
                    <Text style={shell.linkText}>
                      {openingId === item.id ? "Abrindo..." : "Abrir"}
                    </Text>
                  </Pressable>
                </View>
            )}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitleOnly: { marginTop: 4 },
  docIntro: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 20,
  },
  loader: { marginTop: 24 },
  pressed: { opacity: 0.88 },
});
