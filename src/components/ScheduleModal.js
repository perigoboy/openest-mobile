// src/components/ScheduleModal.js
// Front — modal de "Agendar Encontro" (espelha o ScheduleModal do web).
// Monta o payload { conversation_id, other_user_id, titulo, scheduled_at,
// local, nota } e devolve via onSubmit; o Chat envia como [CONVITE_EVENTO].
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../styles/theme";

// "YYYY-MM-DDTHH:mm" no horário local (mesmo formato do datetime-local do web).
export function formatDateTimeLocal(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTimeLabel(date) {
  if (!(date instanceof Date)) return "Escolher data e hora";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ScheduleModal({ visible, contactName, conversationId, otherUserId, onClose, onSubmit }) {
  const [titulo, setTitulo] = useState(`Encontro com ${contactName || "Usuário"}`);
  const [date, setDate] = useState(null);
  const [local, setLocal] = useState("");
  const [nota, setNota] = useState("");
  const [pickerMode, setPickerMode] = useState(null); // 'date' | 'time' | null
  const [draftDate, setDraftDate] = useState(null);

  function reset() {
    setTitulo(`Encontro com ${contactName || "Usuário"}`);
    setDate(null);
    setLocal("");
    setNota("");
    setPickerMode(null);
    setDraftDate(null);
  }

  function close() {
    reset();
    onClose?.();
  }

  // Android mostra um picker por vez: data → hora.
  function handlePickerChange(event, selected) {
    if (event?.type === "dismissed") {
      setPickerMode(null);
      return;
    }
    if (pickerMode === "date") {
      const base = selected || new Date();
      setDraftDate(base);
      setPickerMode("time");
    } else if (pickerMode === "time") {
      const d = new Date(draftDate || new Date());
      const t = selected || new Date();
      d.setHours(t.getHours(), t.getMinutes(), 0, 0);
      setDate(d);
      setPickerMode(null);
    }
  }

  function handleSubmit() {
    if (!date) return;
    onSubmit?.({
      conversation_id: conversationId,
      other_user_id: otherUserId,
      titulo: titulo.trim() || `Encontro com ${contactName || "Usuário"}`,
      scheduled_at: formatDateTimeLocal(date),
      local: local.trim(),
      nota: nota.trim(),
    });
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="schedule-modal">
          <View style={styles.header}>
            <Ionicons name="calendar" size={22} color={colors.primaryLight} />
            <Text style={styles.title}>Agendar Encontro</Text>
            <TouchableOpacity
              testID="schedule-close"
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Fechar agendamento"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>com {contactName || "Usuário"}</Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Título</Text>
            <TextInput
              testID="schedule-titulo"
              style={styles.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex: Café no centro"
              placeholderTextColor={colors.textMuted}
              maxLength={100}
              accessibilityLabel="Título do encontro"
            />

            <Text style={styles.label}>Data e hora *</Text>
            <TouchableOpacity
              testID="schedule-pick-datetime"
              style={styles.input}
              onPress={() => setPickerMode("date")}
              accessibilityRole="button"
              accessibilityLabel="Escolher data e hora do encontro"
            >
              <Text style={[styles.dateText, !date && styles.datePlaceholder]}>{formatDateTimeLabel(date)}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Local</Text>
            <TextInput
              testID="schedule-local"
              style={styles.input}
              value={local}
              onChangeText={setLocal}
              placeholder="Ex: Praça do Ferreira"
              placeholderTextColor={colors.textMuted}
              maxLength={200}
              accessibilityLabel="Local do encontro"
            />

            <Text style={styles.label}>Nota (opcional)</Text>
            <TextInput
              testID="schedule-nota"
              style={[styles.input, styles.textArea]}
              value={nota}
              onChangeText={setNota}
              placeholder="Algum detalhe extra..."
              placeholderTextColor={colors.textMuted}
              maxLength={300}
              multiline
              accessibilityLabel="Nota do encontro"
            />

            <TouchableOpacity
              testID="schedule-submit"
              style={[styles.submit, !date && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!date}
              accessibilityRole="button"
              accessibilityLabel="Enviar convite de encontro"
              accessibilityState={{ disabled: !date }}
            >
              <Text style={styles.submitText}>Enviar Convite</Text>
            </TouchableOpacity>
          </ScrollView>

          {pickerMode ? (
            <DateTimePicker
              testID="schedule-datetimepicker"
              value={draftDate || date || new Date()}
              mode={pickerMode}
              is24Hour
              minimumDate={pickerMode === "date" ? new Date() : undefined}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handlePickerChange}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  card: {
    maxHeight: "85%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", columnGap: spacing.sm },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...typography.body,
    justifyContent: "center",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  dateText: { ...typography.body, color: colors.text },
  datePlaceholder: { color: colors.textMuted },
  submit: {
    marginTop: spacing.lg,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { ...typography.h3, color: colors.white },
});
