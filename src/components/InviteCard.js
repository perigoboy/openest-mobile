// src/components/InviteCard.js
// Front — card visual do "Convite de Encontro" dentro do balão (espelha o card
// roxo do web). Para quem recebeu: Aceitar/Recusar. Para quem enviou:
// "Aguardando resposta...".
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../styles/theme";

function formatWhen(scheduledAt) {
  if (!scheduledAt) return null;
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function InviteCard({ invite, isMine, responding, onAccept, onReject }) {
  const when = formatWhen(invite?.scheduled_at);
  return (
    <View style={styles.card} testID="invite-card">
      <View style={styles.header}>
        <Ionicons name="calendar" size={16} color={colors.white} />
        <Text style={styles.headerText}>Convite de Encontro</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.titulo} numberOfLines={2}>{invite?.titulo || "Encontro"}</Text>
        {invite?.local ? (
          <View style={styles.row}>
            <Ionicons name="location" size={14} color={colors.primaryLight} />
            <Text style={styles.rowText} numberOfLines={1}>{invite.local}</Text>
          </View>
        ) : null}
        {when ? (
          <View style={styles.row}>
            <Ionicons name="time" size={14} color={colors.primaryLight} />
            <Text style={styles.rowText}>{when}</Text>
          </View>
        ) : null}
        {invite?.nota ? <Text style={styles.nota} numberOfLines={3}>{invite.nota}</Text> : null}

        {isMine ? (
          <Text style={styles.waiting} testID="invite-waiting">Aguardando resposta…</Text>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              testID="invite-reject"
              style={[styles.btn, styles.reject]}
              onPress={onReject}
              disabled={responding}
              accessibilityRole="button"
              accessibilityLabel="Recusar convite de encontro"
            >
              <Text style={styles.rejectText}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="invite-accept"
              style={[styles.btn, styles.accept]}
              onPress={onAccept}
              disabled={responding}
              accessibilityRole="button"
              accessibilityLabel="Aceitar convite de encontro"
            >
              <Text style={styles.acceptText}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 248,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  headerText: { ...typography.caption, fontWeight: "700", color: colors.white },
  body: { padding: spacing.sm, rowGap: spacing.xs },
  titulo: { ...typography.body, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", columnGap: spacing.xs },
  rowText: { ...typography.caption, color: colors.text, flex: 1 },
  nota: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  waiting: { ...typography.caption, fontStyle: "italic", color: colors.textMuted, marginTop: spacing.xs },
  actions: { flexDirection: "row", columnGap: spacing.sm, marginTop: spacing.sm },
  btn: { flex: 1, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  accept: { backgroundColor: colors.success },
  acceptText: { ...typography.body, fontWeight: "700", color: colors.white },
  reject: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.danger },
  rejectText: { ...typography.body, fontWeight: "700", color: colors.danger },
});
