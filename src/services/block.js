// src/services/block.js
// T037 — Bloqueio de usuário: ação de proteção imediata e bilateral.
// Dispara POST /api/bloquear e o front remove o usuário bloqueado das
// listagens locais (Discovery, Matches, Chat).
import api from "./api";

export async function blockUser(blockedId) {
  if (blockedId == null) {
    throw new Error("Não foi identificar o usuário a ser bloqueado.");
  }

  const { data } = await api.post("/api/bloquear", {
    blocked_id: blockedId,
  });
  return data;
}
