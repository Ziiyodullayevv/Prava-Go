import React, { useLayoutEffect } from 'react';
import { config } from './config';
import { useColorScheme as useRNColorScheme, View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { useColorScheme } from 'nativewind';

export type ModeType = 'light' | 'dark' | 'system';

export function GluestackUIProvider({
  mode = 'light',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  const { setColorScheme } = useColorScheme();
  const systemColorScheme = useRNColorScheme();
  const resolvedMode =
    mode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : mode;

  useLayoutEffect(() => {
    // Avoid passing "system" here because it can become null in native
    // AppearanceModule on Android and crash.
    setColorScheme(resolvedMode);
  }, [resolvedMode, setColorScheme]);

  return (
    <View
      style={[
        config[resolvedMode],
        { flex: 1, height: '100%', width: '100%' },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
