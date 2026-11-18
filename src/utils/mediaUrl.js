// src/utils/mediaUrl.js
// URLs de mídia (fotos de perfil, imagens do chat) vindas da API.
//
// No navegador do notebook, "http://localhost:3000/..." funciona; no celular
// Android, "localhost" é o próprio celular e a imagem não carrega. Esta função
// troca hosts locais (localhost, 127.0.0.1, 0.0.0.0, 10.0.2.2) pelo host da
// API configurada em EXPO_PUBLIC_API_URL. URLs públicas (ex.: Cloudinary)
// passam sem alteração.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "10.0.2.2"]);

export function resolveMediaUrl(url, apiUrl = process.env.EXPO_PUBLIC_API_URL) {
  if (typeof url !== "string" || !url.trim()) return null;
  const value = url.trim();

  // Caminho relativo (ex.: "/uploads/foto.jpg") → prefixa com a API.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return apiUrl ? `${apiUrl.replace(/\/+$/, "")}${value}` : null;
  }

  const match = value.match(/^(https?):\/\/([^/:?#]+)(:\d+)?(.*)$/i);
  if (!match) return null;

  const [, , host, , rest] = match;
  if (!LOCAL_HOSTS.has(host.toLowerCase()) || !apiUrl) return value;

  const api = apiUrl.match(/^(https?):\/\/([^/:?#]+)(:\d+)?/i);
  if (!api) return value;
  const [, apiProtocol, apiHost, apiPort = ""] = api;
  return `${apiProtocol}://${apiHost}${apiPort}${rest}`;
}

export default resolveMediaUrl;
