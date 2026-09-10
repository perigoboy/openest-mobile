import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

describe('Smoke test - configuração do Jest', () => {
  it('renderiza um componente React Native simples', async () => {
    await render(
      <View>
        <Text>Openest Mobile</Text>
      </View>
    );

    expect(screen.getByText('Openest Mobile')).toBeTruthy();
  });

  it('valida que operações matemáticas básicas funcionam', () => {
    expect(1 + 1).toBe(2);
  });
});