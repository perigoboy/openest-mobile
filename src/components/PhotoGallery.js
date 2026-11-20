// src/components/PhotoGallery.js
// T021 — grid de múltiplas fotos do perfil: adicionar/remover até N fotos,
// reordenar (setas) e definir a foto principal (posição 0 da lista).
import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MAX_PROFILE_PHOTOS } from "../services/profilePhotos";
import { spacing } from "../styles/theme";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";

export default function PhotoGallery({
  photos = [],
  onAdd,
  onRemove,
  onMove,
  onSetMain,
  disabled = false,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const mainPhoto = photos[0];

  return (
    <View style={styles.grid} testID="photo-gallery">
      {photos.map((uri, index) => {
        const isMain = uri === mainPhoto && index === 0;
        return (
          <View key={`${uri}-${index}`} style={styles.tile} testID={`photo-tile-${index}`}>
            <Image source={{ uri }} style={styles.image} testID={`photo-image-${index}`} />

            {isMain && (
              <View style={styles.mainBadge} testID={`photo-main-badge-${index}`}>
                <Ionicons name="star" size={9} color={colors.onPrimary} />
                <Text style={styles.mainBadgeText}>Principal</Text>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              testID={`btn-remove-photo-${index}`}
              style={styles.removeBadge}
              onPress={() => onRemove && onRemove(index)}
              disabled={disabled}
              accessibilityLabel={`Remover foto ${index + 1}`}
            >
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.tileActions}>
              <TouchableOpacity
                accessibilityRole="button"
                testID={`btn-move-left-${index}`}
                style={[styles.actionButton, (disabled || index === 0) && styles.actionButtonDisabled]}
                onPress={() => onMove && onMove(index, index - 1)}
                disabled={disabled || index === 0}
                accessibilityLabel={`Mover foto ${index + 1} para a esquerda`}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                testID={`btn-set-main-${index}`}
                style={[styles.actionButton, (disabled || index === 0) && styles.actionButtonDisabled]}
                onPress={() => onSetMain && onSetMain(index)}
                disabled={disabled || index === 0}
                accessibilityLabel={`Definir foto ${index + 1} como principal`}
              >
                <Ionicons name="star-outline" size={16} color={colors.accent} />
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                testID={`btn-move-right-${index}`}
                style={[
                  styles.actionButton,
                  (disabled || index === photos.length - 1) && styles.actionButtonDisabled,
                ]}
                onPress={() => onMove && onMove(index, index + 1)}
                disabled={disabled || index === photos.length - 1}
                accessibilityLabel={`Mover foto ${index + 1} para a direita`}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Adicionar — só enquanto a galeria não atingir o limite N (T021) */}
      {photos.length < MAX_PROFILE_PHOTOS && (
        <TouchableOpacity
          accessibilityRole="button"
          testID="btn-add-photo"
          style={styles.addTile}
          onPress={onAdd}
          disabled={disabled}
          accessibilityLabel="Adicionar foto ao perfil"
        >
          <Ionicons name="add" size={26} color={colors.accent} style={styles.addIcon} />
          <Text style={styles.addText}>Adicionar</Text>
          <Text style={styles.addCount}>
            {photos.length}/{MAX_PROFILE_PHOTOS}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  tile: {
    width: 104,
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    margin: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    position: "relative",
  },
  image: {
    width: "100%",
    height: 104,
  },
  mainBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 3,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainBadgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: "700",
  },
  removeBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  removeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  tileActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 36,
    alignItems: "center",
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.3,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  addTile: {
    width: 104,
    height: 140,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    margin: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  addIcon: {
    marginBottom: 2,
  },
  addText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  addCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
