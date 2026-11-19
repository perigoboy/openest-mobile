// src/routes/navigationRef.js
// Front-1 — permite navegar de FORA da árvore de telas (ex.: do banner de
// notificação in-app, montado no App ao lado do NavigationContainer).
import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

// Abre a conversa correspondente (mesmo destino do deep link / toque na push).
export function navigateToChat(conversationId, contact) {
  if (!navigationRef.isReady() || conversationId == null || conversationId === "") return false;
  navigationRef.navigate("Chat", { conversationId, contact });
  return true;
}
