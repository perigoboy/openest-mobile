// T027 — Tela de Preferências de Busca (filtros do Discovery).
// Abre pelo botão "Perto de mim"/"Filtros" no topo da Discovery.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { searchStyles as styles } from "./styles";
import { DEFAULT_PREFERENCES, GENDER_OPTIONS, loadPreferences, savePreferences } from "../../services/searchPreferences";

function Stepper({ testID, value, min, max, step = 1, suffix = "", onChange }) {
  function bump(delta) {
    onChange(Math.min(max, Math.max(min, value + delta * step)));
  }
  return (
    <View style={styles.stepper}>
      <TouchableOpacity testID={`${testID}-minus`} style={styles.stepBtn} onPress={() => bump(-1)} accessibilityRole="button" accessibilityLabel={`Diminuir ${testID}`}>
        <Ionicons name="remove" size={20} color="#6D1BC7" />
      </TouchableOpacity>
      <Text testID={testID} style={styles.stepValue}>{value}{suffix}</Text>
      <TouchableOpacity testID={`${testID}-plus`} style={styles.stepBtn} onPress={() => bump(1)} accessibilityRole="button" accessibilityLabel={`Aumentar ${testID}`}>
        <Ionicons name="add" size={20} color="#6D1BC7" />
      </TouchableOpacity>
    </View>
  );
}

export default function SearchPreferences({ navigation, route }) {
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
    <LinearGradient colors={["#3D0A7A", "#8B3BD6", "#E3BFFF", "#F9F1FF"]} locations={[0, 0.4, 0.75, 1]} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity testID="btn-back" style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Filtros de busca</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <BlurView intensity={45} tint="light" style={styles.card}>
            <Text style={styles.section}>Faixa etária</Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Idade mínima</Text>
                <Stepper testID="min-age" value={prefs.minAge} min={18} max={99} onChange={(v) => set("minAge", v)} />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Idade máxima</Text>
                <Stepper testID="max-age" value={prefs.maxAge} min={18} max={99} onChange={(v) => set("maxAge", v)} />
              </View>
            </View>
            <Text style={styles.section}>Distância máxima</Text>
            <Stepper testID="max-distance" value={prefs.maxDistanceKm} min={1} max={500} suffix=" km" onChange={(v) => set("maxDistanceKm", v)} />
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
          </BlurView>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
