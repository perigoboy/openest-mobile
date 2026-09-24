# Anotações — Testes (Sprint 2)

> **Sprint:** 2
> **Task:** Cobrir com testes unitários as regras críticas de login/cadastro
> **Responsável:** Leandro
> **Data:** [coloca a data]
> **Status:** ✅ Concluído — 30/30 testes passando

---

## ⚠️ Peculiaridades do ambiente (LER ANTES DE MEXER)

Esta sprint revelou vários comportamentos não-óbvios do ecossistema
Expo SDK 57 + React 19 + Jest + testing-library. **Anotado aqui pra
não perdermos tempo de novo nas próximas sprints.**

### 1. Versão da testing-library — NÃO ATUALIZAR

Estamos em `@testing-library/react-native@13.3.3`.

**NÃO atualizar pra v14.** A v14 introduziu `render` assíncrono
que causa "overlapping act() calls" com React 19 + Expo SDK 57.
Bug conhecido e ainda não corrigido.

Quando a v14 estabilizar, podemos migrar — mas por enquanto
fica a v13.

### 2. `@react-native/jest-preset` — instalar manualmente

A partir do RN 0.85+, o Jest preset do React Native foi movido
pra um pacote separado. O `jest-expo` precisa dele como peer
dependency, mas o `npm` não instala automaticamente.

**Se clonar o repo do zero e o `npm test` reclamar disso:**
```bash
npx expo install @react-native/jest-preset