// src/screens/Discovery/mockProfiles.js
// FRONT-ONLY: baralho mockado espelhando o protótipo para evoluir o front
// sem depender do backend (Discovery Engine real chega na Sprint 4).
export const MOCK_PROFILES = [
  {
    id: 'proto-casal-1',
    name: 'Julio e Talita',
    age: 25,
    neighborhood: 'Aldeota',
    city: 'Fortaleza',
    distance: '3,33 quilômetros',
    kind: 'couple',
    kindLabel: 'Casal',
    photo:
      'https://images.unsplash.com/photo-1522098543979-ffc7f79a56c4?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'proto-juliana',
    name: 'Juliana Ferraz',
    age: 26,
    neighborhood: 'Meireles',
    city: 'Fortaleza',
    distance: '0,5 quilômetros',
    kind: 'single',
    kindLabel: null,
    photo:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'proto-julia',
    name: 'Julia Maria',
    age: 26,
    neighborhood: 'Meireles',
    city: 'Fortaleza',
    distance: '2 quilômetros',
    kind: 'group',
    kindLabel: 'Grupo',
    photo:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'proto-sofia',
    name: 'Sofia Espanha',
    age: 26,
    neighborhood: 'Caucaia',
    city: 'Fortaleza',
    distance: '15 quilômetros',
    kind: 'group',
    kindLabel: 'Grupo',
    photo:
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=80',
  },
];
