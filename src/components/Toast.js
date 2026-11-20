import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { darkColors as colors, spacing, radius, typography } from "../styles/theme";

const ToastContext = createContext(null);

// T052 — snackbar escuro nos DOIS modos (padrão Material/WhatsApp): o texto
// branco mantém contraste AA tanto no tema claro quanto no escuro.
export const VARIANT_COLORS = {
  info: "#2A2533",
  success: colors.successDark,
  error: colors.dangerDark,
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef(null);

  const show = useCallback(
    (message, { type = "info", duration = 2500 } = {}) => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      setToast({ message, type });

      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      hideTimeout.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, duration);
    },
    [opacity]
  );

  // Limpa o timer de auto-ocultação ao desmontar — senão ele dispara depois
  // do unmount (em testes isso derruba o worker do Jest; no app, é setState
  // em componente desmontado).
  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { backgroundColor: VARIANT_COLORS[toast.type], opacity },
          ]}
        >
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast precisa ser usado dentro de <ToastProvider>");
  }
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 96, // acima da barra inferior
    left: spacing.md,
    right: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  text: {
    ...typography.body,
    color: colors.white,
    textAlign: "center",
  },
});
