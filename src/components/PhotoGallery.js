// src/components/PhotoGallery.js
// T021 — grid de múltiplas fotos do perfil: adicionar/remover até N fotos,
// reordenar (setas) e definir a foto principal (posição 0 da lista).
import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { MAX_PROFILE_PHOTOS } from "../services/profilePhotos";
import { colors, spacing } from "../styles/theme";

export default function PhotoGallery({
  photos = [],
  onAdd,
  onRemove,
  onMove,
  onSetMain,
  disabled = false,
}) {
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
                <Text style={styles.mainBadgeText}>★ Principal</Text>
              </View>
            )}

            <TouchableOpacity
              testID={`btn-remove-photo-${index}`}
              style={styles.removeBadge}
              onPress={() => onRemove && onRemove(index)}
              disabled={disabled}
              accessibilityLabel={`Remover foto ${index + 1}`}
            >
              <Text style={styles.removeBadgeText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.tileActions}>
              <TouchableOpacity
                testID={`btn-move-left-${index}`}
                style={[styles.actionButton, (disabled || index === 0) && styles.actionButtonDisabled]}
                onPress={() => onMove && onMove(index, index - 1)}
                disabled={disabled || index === 0}
                accessibilityLabel={`Mover foto ${index + 1} para a esquerda`}
              >
                <Text style={styles.actionText}>←</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID={`btn-set-main-${index}`}
                style={[styles.actionButton, (disabled || index === 0) && styles.actionButtonDisabled]}
                onPress={() => onSetMain && onSetMain(index)}
                disabled={disabled || index === 0}
                accessibilityLabel={`Definir foto ${index + 1} como principal`}
              >
                <Text style={styles.actionText}>★</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID={`btn-move-right-${index}`}
                style={[
                  styles.actionButton,
                  (disabled || index === photos.length - 1) && styles.actionButtonDisabled,
                ]}
                onPress={() => onMove && onMove(index, index + 1)}
                disabled={disabled || index === photos.length - 1}
                accessibilityLabel={`Mover foto ${index + 1} para a direita`}
              >
                <Text style={styles.actionText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Adicionar — só enquanto a galeria não atingir o limite N (T021) */}
      {photos.length < MAX_PROFILE_PHOTOS && (
        <TouchableOpacity
          testID="btn-add-photo"
          style={styles.addTile}
          onPress={onAdd}
          disabled={disabled}
          accessibilityLabel="Adicionar foto ao perfil"
        >
          <Text style={styles.addIcon}>＋</Text>
          <Text style={styles.addText}>Adicionar</Text>
          <Text style={styles.addCount}>
            {photos.length}/{MAX_PROFILE_PHOTOS}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
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
    backgroundColor: "#7b2cbf",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
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
    backgroundColor: "rgba(0,0,0,0.35)",
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
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    margin: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  addIcon: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 4,
  },
  addText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  addCount: {
    fontSize: 10,
    color: colors.textMuted || "#dcdde1",
    marginTop: 2,
  },
});
