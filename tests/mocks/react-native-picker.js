// tests/mocks/react-native-picker.js
const React = require('react');
const { View } = require('react-native');

const MockPickerItem = () => null;

// Componente Picker com a propriedade estática `.Item` que o JSX usa
const MockPicker = ({ children, ...props }) =>
  React.createElement(View, props, children);

// ⚠️ AQUI TÁ A CORREÇÃO: o JSX usa <Picker.Item>, então o Picker
// precisa ter `.Item` como propriedade do próprio componente.
MockPicker.Item = MockPickerItem;

module.exports = {
  Picker: MockPicker,
  PickerItem: MockPickerItem,
  // Exporta também como default por garantia (caso alguém importe assim)
  default: MockPicker,
};