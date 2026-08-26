import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeAccentKey = 'blurple' | 'emerald' | 'cyberpunk' | 'cyan' | 'oled';

export interface ThemeColors {
  key: ThemeAccentKey;
  name: string;
  accent: string;
  accentHover: string;
  accentSubtle: string;
  bgDark: string;
  bgSurface: string;
  bgCard: string;
  textPrimary: string;
  textMuted: string;
  borderSubtle: string;
}

export const THEME_PALETTES: Record<ThemeAccentKey, ThemeColors> = {
  blurple: {
    key: 'blurple',
    name: 'Discord Blurple',
    accent: '#5865F2',
    accentHover: '#4752C4',
    accentSubtle: 'rgba(88, 101, 242, 0.15)',
    bgDark: '#0E0F12',
    bgSurface: '#16181D',
    bgCard: '#1C1E24',
    textPrimary: '#F2F3F5',
    textMuted: '#949BA4',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
  },
  emerald: {
    key: 'emerald',
    name: 'Emerald Matrix',
    accent: '#23A55A',
    accentHover: '#1B8246',
    accentSubtle: 'rgba(35, 165, 90, 0.15)',
    bgDark: '#0B0F0D',
    bgSurface: '#121A15',
    bgCard: '#18241E',
    textPrimary: '#F2F5F3',
    textMuted: '#8BA194',
    borderSubtle: 'rgba(35, 165, 90, 0.15)',
  },
  cyberpunk: {
    key: 'cyberpunk',
    name: 'Cyberpunk Neon',
    accent: '#A855F7',
    accentHover: '#9333EA',
    accentSubtle: 'rgba(168, 85, 247, 0.18)',
    bgDark: '#0E0A14',
    bgSurface: '#181224',
    bgCard: '#221933',
    textPrimary: '#FAF5FF',
    textMuted: '#A89DB8',
    borderSubtle: 'rgba(168, 85, 247, 0.18)',
  },
  cyan: {
    key: 'cyan',
    name: 'Midnight Cyan',
    accent: '#06B6D4',
    accentHover: '#0891B2',
    accentSubtle: 'rgba(6, 182, 212, 0.15)',
    bgDark: '#0A0F14',
    bgSurface: '#111A22',
    bgCard: '#17232E',
    textPrimary: '#F0F9FF',
    textMuted: '#8EA4B8',
    borderSubtle: 'rgba(6, 182, 212, 0.15)',
  },
  oled: {
    key: 'oled',
    name: 'OLED Pure Black',
    accent: '#E4E7EB',
    accentHover: '#D1D5DB',
    accentSubtle: 'rgba(255, 255, 255, 0.12)',
    bgDark: '#000000',
    bgSurface: '#0A0A0A',
    bgCard: '#121212',
    textPrimary: '#FFFFFF',
    textMuted: '#888888',
    borderSubtle: 'rgba(255, 255, 255, 0.12)',
  },
};

const THEME_STORAGE_KEY = '@fluffy/theme_accent';

interface ThemeContextValue {
  theme: ThemeColors;
  setThemeAccent: (key: ThemeAccentKey) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEME_PALETTES.blurple,
  setThemeAccent: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeAccentKey>('blurple');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved && saved in THEME_PALETTES) {
        setThemeKey(saved as ThemeAccentKey);
      }
    });
  }, []);

  const setThemeAccent = useCallback(async (key: ThemeAccentKey) => {
    setThemeKey(key);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, key);
  }, []);

  const theme = THEME_PALETTES[themeKey] || THEME_PALETTES.blurple;

  return (
    <ThemeContext.Provider value={{ theme, setThemeAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
