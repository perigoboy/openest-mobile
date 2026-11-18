// src/services/uploadConfig.js
// Config de upload multipart para o React Native.
//
// Por que existe: setar manualmente `Content-Type: multipart/form-data` no RN
// IMPEDE que o fetch/axios gere o `boundary`, e o multer (API) não consegue
// parsear o arquivo → responde 400 "Nenhuma imagem enviada". (No browser isso
// funciona porque ele ignora o header manual e corrige sozinho; o RN respeita.)
// A solução: NÃO enviar Content-Type — o RN define
// `multipart/form-data; boundary=...` automaticamente a partir do FormData.
export function multipartUploadConfig(extra = {}) {
  return {
    timeout: 60000, // upload pode passar do timeout padrão de 10s
    ...extra,
    transformRequest: (data, headers) => {
      // Remove qualquer Content-Type (inclusive o default application/json do
      // axios) para o RN montar o multipart com boundary.
      if (headers) {
        if (typeof headers.delete === "function") headers.delete("Content-Type");
        delete headers["Content-Type"];
        delete headers["content-type"];
      }
      return data; // devolve o FormData intacto (não deixa o axios serializar)
    },
  };
}
