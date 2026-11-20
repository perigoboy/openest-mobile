// Card "Encontro marcado" no chat: aparece quando um convite é aceito (no
// lugar do antigo texto "✅ Convite Aceite!"). Mostra data/hora e local quando
// a API tem esses dados e leva direto para a aba Encontros.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, typography } from "../styles/theme";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";

// "sáb., 22 de nov. · 16:00" (ou null se a data não for válida).
export function formatMeetingWhen(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const dia = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dia} · ${hh}:${mm}`;
}

export default function MeetingCard({ meeting, onOpen }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const quando = formatMeetingWhen(meeting?.scheduled_at);
  const local = meeting?.local || null;

  return (
    <View style={styles.card} testID="meeting-card">
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="calendar-outline" size={18} color={colors.successText} />
          <View style={styles.check}>
            <Ionicons name="checkmark" size={9} color={colors.onPrimary} />
          </View>
        </View>
        <View style={styles.titles}>
          <Text style={styles.title}>Encontro marcado</Text>
          {meeting?.titulo ? <Text style={styles.subtitle} numberOfLines={1}>{meeting.titulo}</Text> : null}
        </View>
      </View>

      {quando || local ? (
        <View style={styles.body}>
          {quando ? (
            <View style={styles.row}>
              <Ionicons name="time-outline" size={14} color={colors.accent} />
              <Text style={styles.rowText}>{quando}</Text>
            </View>
          ) : null}
          {local ? (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={14} color={colors.accent} />
              <Text style={styles.rowText} numberOfLines={2}>{local}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        testID="meeting-card-open"
        onPress={onOpen}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel="Ver encontro na aba Encontros"
      >
        <Text style={styles.ctaText}>Ver encontro</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    width: 250,
    maxWidth: "100%",
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: "row", alignItems: "center", columnGap: 10, padding: 12, paddingBottom: 8 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    position: "absolute",
    right: 3,
    bottom: 3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.successText,
    alignItems: "center",
    justifyContent: "center",
  },
  titles: { flex: 1, minWidth: 0 },
  title: { ...typography.bodyStrong, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  body: { paddingHorizontal: 12, paddingBottom: 10, rowGap: 4 },
  row: { flexDirection: "row", alignItems: "center", columnGap: 6 },
  rowText: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaPressed: { backgroundColor: colors.surfaceMuted },
  ctaText: { ...typography.bodyStrong, color: colors.accent },
});
