// Foto de VISUALIZAÇÃO ÚNICA no chat (estilo WhatsApp).
//
// <ViewOnceCard>   → o que aparece NO BALÃO (nunca a miniatura da foto):
//     recebida e fechada: ícone "1" + "Foto" (toque para abrir)
//     já aberta:          ícone tracejado + "Aberta" (sem toque)
//     enviada por mim:    "Foto" e, quando o outro abrir, "Aberta" ao vivo
// <ViewOnceViewer> → tela cheia que mostra a foto UMA vez. Enquanto está
//     aberta, bloqueia print de tela (FLAG_SECURE no Android).
import React, { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useThemedStyles } from "../contexts/ThemeContext";
import { spacing, typography } from "../styles/theme";

export function ViewOnceCard({ message, tone = "received", opening = false, onOpen }) {
  const styles = useThemedStyles(createStyles);
  const opened = !!message?.viewOnceOpened;
  const mine = !!message?.isMine;
  const canOpen = !mine && !opened && !opening;
  const textStyle = tone === "sent" ? styles.textSent : styles.textReceived;
  const iconColor = tone === "sent" ? styles.textSent.color : styles.iconAccent.color;

  const label = opened ? "Aberta" : "Foto";
  const a11y = opened
    ? "Foto de visualização única já aberta"
    : mine
      ? "Foto de visualização única enviada"
      : "Foto de visualização única. Toque para abrir";

  return (
    <Pressable
      testID={`view-once-${message?.id}`}
      onPress={canOpen ? () => onOpen?.(message) : undefined}
      disabled={!canOpen}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !canOpen, busy: opening }}
    >
      {opening ? (
        <ActivityIndicator size="small" color={iconColor} style={styles.badge} />
      ) : opened ? (
        <View style={[styles.badge, styles.badgeOpened, { borderColor: iconColor }]} testID="view-once-opened-icon" />
      ) : (
        <View style={[styles.badge, styles.badgeClosed, { borderColor: iconColor }]} testID="view-once-closed-icon">
          <Text style={[styles.badgeText, { color: iconColor }]}>1</Text>
        </View>
      )}
      <Text style={[styles.label, textStyle, opened && styles.labelOpened]}>{label}</Text>
    </Pressable>
  );
}

export function ViewOnceViewer({ visible, url, caption, onClose }) {
  if (!visible) return null;
  return <SecureViewer url={url} caption={caption} onClose={onClose} />;
}

// Só existe enquanto a foto está na tela → o bloqueio de captura dura
// exatamente o tempo da visualização.
function SecureViewer({ url, caption, onClose }) {
  usePreventScreenCapture();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={viewer.root} testID="view-once-viewer">
        <View style={[viewer.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            testID="view-once-viewer-close"
            onPress={onClose}
            style={viewer.close}
            accessibilityRole="button"
            accessibilityLabel="Fechar foto"
            hitSlop={8}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
          <View style={viewer.tag}>
            <Ionicons name="eye-off-outline" size={14} color="#FFFFFF" />
            <Text style={viewer.tagText}>Visualização única</Text>
          </View>
        </View>

        <View style={viewer.imageArea}>
          {failed ? (
            <Text style={viewer.error}>Não foi possível carregar a foto.</Text>
          ) : (
            <Image
              testID="view-once-viewer-image"
              source={{ uri: url }}
              style={viewer.image}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
              accessibilityLabel="Foto de visualização única"
            />
          )}
          {loading && !failed ? <ActivityIndicator style={StyleSheet.absoluteFill} color="#FFFFFF" /> : null}
        </View>

        <View style={[viewer.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {caption ? <Text style={viewer.caption}>{caption}</Text> : null}
          <Text style={viewer.notice}>Esta foto não poderá ser aberta de novo.</Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: spacing.sm,
      paddingVertical: 6,
      paddingRight: spacing.sm,
      minWidth: 120,
    },
    badge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeClosed: {
      borderWidth: 1.5,
    },
    badgeOpened: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      opacity: 0.7,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    label: {
      ...typography.bodyStrong,
    },
    labelOpened: {
      fontWeight: "400",
      fontStyle: "italic",
      opacity: 0.85,
    },
    textSent: {
      color: colors.bubbleSentText,
    },
    textReceived: {
      color: colors.bubbleReceivedText,
    },
    iconAccent: {
      color: colors.accent,
    },
  });

const viewer = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
  imageArea: {
    flex: 1,
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  error: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    rowGap: 6,
  },
  caption: {
    color: "#FFFFFF",
    fontSize: 15,
    textAlign: "center",
  },
  notice: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
  },
});
