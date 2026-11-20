// T027 — Tela de Preferências de Busca (filtros do Discovery).
// Abre pelo botão "Perto de mim"/"Filtros" no topo da Discovery.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createSearchStyles } from "./styles";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { DEFAULT_PREFERENCES, GENDER_OPTIONS, loadPreferences, savePreferences } from "../../services/searchPreferences";

// T052 — `label` é o nome lido pelo leitor de tela (ex.: "idade mínima").
function Stepper({ testID, label, value, min, max, step = 1, suffix = "", onChange }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createSearchStyles);
  const name = label || testID;
  function bump(delta) {
    onChange(Math.min(max, Math.max(min, value + delta * step)));
  }
  return (
    <View style={styles.stepper}>
      <TouchableOpacity testID={`${testID}-minus`} style={styles.stepBtn} onPress={() => bump(-1)} accessibilityRole="button" accessibilityLabel={`Diminuir ${name}`} accessibilityState={{ disabled: value <= min }}>
        <Ionicons name="remove" size={20} color={colors.accent} />
      </TouchableOpacity>
      <Text testID={testID} style={styles.stepValue} accessibilityLabel={`${name}: ${value}${suffix}`}>{value}{suffix}</Text>
      <TouchableOpacity testID={`${testID}-plus`} style={styles.stepBtn} onPress={() => bump(1)} accessibilityRole="button" accessibilityLabel={`Aumentar ${name}`} accessibilityState={{ disabled: value >= max }}>
        <Ionicons name="add" size={20} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

export default function SearchPreferences({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createSearchStyles);
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const initial = route?.params?.initial || await loadPreferences();
      if (mounted) setPrefs({ ...DEFAULT_PREFERENCES, ...initial });
    })();
    return () => { mounted = false; };
  }, []);

  function set(key, value) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const clean = await savePreferences(prefs);
      route?.params?.onApply?.(clean);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar os filtros.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity testID="btn-back" style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Filtros de busca</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.section}>Faixa etária</Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Idade mínima</Text>
                <Stepper testID="min-age" label="idade mínima" value={prefs.minAge} min={18} max={99} onChange={(v) => set("minAge", v)} />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Idade máxima</Text>
                <Stepper testID="max-age" label="idade máxima" value={prefs.maxAge} min={18} max={99} onChange={(v) => set("maxAge", v)} />
              </View>
            </View>
            <Text style={styles.section}>Distância máxima</Text>
            <Stepper testID="max-distance" label="distância máxima" value={prefs.maxDistanceKm} min={1} max={500} suffix=" km" onChange={(v) => set("maxDistanceKm", v)} />
            <Text style={styles.section}>Mostrar</Text>
            <View style={styles.chips}>
              {GENDER_OPTIONS.map((opt) => {
                const active = prefs.gender === opt.id;
                return (
                  <TouchableOpacity key={opt.id} testID={`gender-${opt.id}`} style={[styles.chip, active && styles.chipActive]} onPress={() => set("gender", opt.id)} accessibilityRole="button" accessibilityState={{ selected: active }}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity testID="btn-save" style={[styles.save, saving && styles.saveDisabled]} onPress={handleSave} disabled={saving} accessibilityRole="button">
              <Text style={styles.saveText}>{saving ? "Salvando..." : "Aplicar filtros"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
