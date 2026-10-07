import api from './api';

/**
 * T020 — Envia a foto de perfil escolhida (galeria/câmera) para a API.
 *
 * O backend expõe POST /api/users/upload-photo com multer +
 * multer-storage-cloudinary (upload.single('image')), então o campo do
 * FormData precisa se chamar "image". A API salva a imagem no Cloudinary,
 * grava o foto_url no usuário e devolve { message, url }.
 *
 * @param {string} uri URI local da imagem retornada pelo expo-image-picker.
 * @param {{ fileName?: string, mimeType?: string }} [options]
 * @returns {Promise<string>} URL pública da imagem salva no Cloudinary.
 */
export async function uploadProfilePhoto(
  uri,
  { fileName = 'profile-photo.jpg', mimeType = 'image/jpeg' } = {}
) {
  const formData = new FormData();
  formData.append('image', { uri, name: fileName, type: mimeType });

  const response = await api.post('/api/users/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Upload de imagem pode exceder o timeout padrão de 10s da instância.
    timeout: 60000,
  });

  const url = response.data && response.data.url;
  if (!url) {
    throw new Error('A API não retornou a URL da imagem.');
  }

  return url;
}

export default uploadProfilePhoto;
