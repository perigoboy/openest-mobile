// Câmera nativa ou galeria, com a permissão certa para cada uma.
// Usado no menu de anexos do Chat e na troca de foto do Perfil.
//
// pickImage('camera' | 'gallery') → asset | null (cancelou)
// Lança Error com code 'permission_denied' se o usuário negar o acesso.
import * as ImagePicker from "expo-image-picker";

export const IMAGE_SOURCES = {
  camera: "camera",
  gallery: "gallery",
};

export async function pickImage(source, { quality = 0.75, allowsEditing = false, aspect } = {}) {
  const isCamera = source === IMAGE_SOURCES.camera;
  const permission = isCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission?.status !== "granted") {
    const err = new Error(
      isCamera
        ? "Permita o acesso à câmera nas configurações do celular para tirar fotos."
        : "Permita o acesso às fotos nas configurações do celular para escolher uma imagem."
    );
    err.code = "permission_denied";
    throw err;
  }

  const options = { mediaTypes: ["images"], quality, allowsEditing, ...(aspect ? { aspect } : {}) };
  const result = isCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (!result || result.canceled) return null;
  return result.assets?.[0] ?? null;
}
