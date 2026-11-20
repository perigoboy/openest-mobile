// Pré-visualização da foto ANTES de enviar (estilo WhatsApp).
// Fundo sempre escuro (a foto é o foco nos dois temas), legenda opcional,
// botão circular "1" de visualização única e botão de enviar.
import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { tapLight, selectionTick } from "../utils/haptics";

export default function ImagePreviewModal({ visible, asset, onClose, onSend }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState("");
  const [viewOnce, setViewOnce] = useState(false);

  // Cada foto nova começa limpa.
  useEffect(() => {
    if (visible) {
      setCaption("");
      setViewOnce(false);
    }
  }, [visible, asset?.uri]);

  function toggleViewOnce() {
    selectionTick();
    setViewOnce((v) => !v);
  }

  function handleSend() {
    tapLight();
    onSend?.({ caption: caption.trim(), viewOnce });
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} testID="image-preview">
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            testID="image-preview-close"
            onPress={onClose}
            style={styles.roundButton}
            accessibilityRole="button"
            accessibilityLabel="Cancelar envio da foto"
            hitSlop={8}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.imageArea}>
          {asset?.uri ? (
            <Image
              testID="image-preview-image"
              source={{ uri: asset.uri }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel="Foto selecionada para envio"
            />
          ) : null}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {viewOnce ? (
            <View style={styles.hint} testID="image-preview-view-once-hint" accessibilityLiveRegion="polite">
              <Ionicons name="eye-off-outline" size={14} color="#FFFFFF" />
              <Text style={styles.hintText}>Foto de visualização única</Text>
            </View>
          ) : null}

          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.captionPill}>
              <TextInput
                testID="image-preview-caption"
                value={caption}
                onChangeText={setCaption}
                placeholder="Adicione uma legenda..."
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.captionInput}
                selectionColor={colors.primary}
                maxLength={1000}
                multiline
                accessibilityLabel="Legenda da foto"
              />
              <Pressable
                testID="image-preview-view-once"
                onPress={toggleViewOnce}
                style={[styles.viewOnceButton, viewOnce && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                accessibilityRole="switch"
                accessibilityState={{ checked: viewOnce }}
                accessibilityLabel="Visualização única"
                accessibilityHint="A foto só poderá ser aberta uma vez"
                hitSlop={6}
              >
                <Text style={styles.viewOnceText}>1</Text>
              </Pressable>
            </View>

            <Pressable
              testID="image-preview-send"
              onPress={handleSend}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel={viewOnce ? "Enviar foto de visualização única" : "Enviar foto"}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0A0F",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  imageArea: {
    flex: 1,
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  hint: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginBottom: 8,
  },
  hintText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    columnGap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  captionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 48,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  captionInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    maxHeight: 110,
    paddingTop: Platform.OS === "ios" ? 9 : 6,
    paddingBottom: Platform.OS === "ios" ? 9 : 6,
  },
  viewOnceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    marginBottom: 2,
  },
  viewOnceText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
