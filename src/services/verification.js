import api from './api';

/**
 * T023 — Envia a selfie de verificação (capturada na câmera frontal) para a API.
 *
 * A rota POST /api/users/verify-photo usa a mesma pilha do upload de foto
 * (auth + multer + Cloudinary com upload.single('image')), então o campo do
 * FormData precisa se chamar "image". A API grava a selfie, confirma que ela
 * corresponde ao perfil e devolve { message, verificado, selfie_url }.
 *
 * @param {string} uri URI local da selfie retornada pelo expo-image-picker.
 * @param {{ fileName?: string, mimeType?: string }} [options]
 * @returns {Promise<{ verificado: boolean, selfieUrl: string, message: string }>}
 */
export async function submitSelfieForVerification(
  uri,
  { fileName = 'selfie.jpg', mimeType = 'image/jpeg' } = {}
) {
  const formData = new FormData();
  formData.append('image', { uri, name: fileName, type: mimeType });

  const response = await api.post('/api/users/verify-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Upload de imagem pode exceder o timeout padrão de 10s da instância.
    timeout: 60000,
  });

  const data = (response && response.data) || {};

  return {
    verificado: data.verificado === true,
    selfieUrl: data.selfie_url || '',
    message: data.message || 'Selfie enviada para verificação.',
  };
}

export default submitSelfieForVerification;
