// src/components/GifPickerModal.js
// Front — seletor de GIFs (o web só tinha placeholder). Busca no Giphy e, ao
// escolher, devolve a URL do .gif; o Chat envia como mensagem (renderiza como
// imagem no mobile e no web, em tempo real via socket).
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { searchGifs } from "../services/giphy";
import { radius, spacing, typography } from "../styles/theme";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";

const SEARCH_DEBOUNCE_MS = 400;

export default function GifPickerModal({ visible, onClose, onSelect }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [term, setTerm] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      setGifs(await searchGifs(query));
    } catch (err) {
      console.error("Erro ao carregar GIFs:", err?.message || err);
      setError("Não foi possível carregar os GIFs.");
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const handle = setTimeout(() => load(term), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [term, visible, load]);

  // Limpa a busca ao fechar.
  useEffect(() => {
    if (!visible) setTerm("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="gif-picker">
          <View style={styles.header}>
            <Text style={styles.title}>Escolha um GIF</Text>
            <TouchableOpacity
              testID="gif-close"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar seletor de GIFs"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              testID="gif-search"
              style={styles.searchInput}
              placeholder="Buscar GIFs..."
              placeholderTextColor={colors.textMuted}
              value={term}
              onChangeText={setTerm}
              accessibilityLabel="Buscar GIFs"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <View style={styles.centered} testID="gif-loading">
              <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando GIFs" />
            </View>
          ) : error ? (
            <View style={styles.centered} testID="gif-error">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <FlatList
              testID="gif-list"
              data={gifs}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`gif-${item.id}`}
                  style={styles.gifCell}
                  activeOpacity={0.8}
                  onPress={() => onSelect(item.url)}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar este GIF"
                >
                  <Image source={{ uri: item.preview }} style={styles.gifImage} resizeMode="cover" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text style={styles.errorText}>Nenhum GIF encontrado.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  sheet: {
    height: "70%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    ...typography.body,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  row: {
    columnGap: spacing.sm,
  },
  gifCell: {
    flex: 1,
    aspectRatio: 1,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  gifImage: {
    width: "100%",
    height: "100%",
  },
});
