import { Stack } from 'expo-router';

/**
 * Expo Router root layout.
 * We only have one screen (index.tsx) which manages all navigation
 * internally via state. The Stack here is a required wrapper but
 * has headerShown: false everywhere since we draw our own UI.
 */
export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
