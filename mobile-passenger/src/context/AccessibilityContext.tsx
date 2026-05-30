import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type TextScaleOption = 'default' | 'large' | 'extraLarge';

type AccessibilityContextValue = {
  highContrastEnabled: boolean;
  textScale: TextScaleOption;
  maxFontSizeMultiplier: number;
  setHighContrastEnabled: (enabled: boolean) => void;
  setTextScale: (scale: TextScaleOption) => void;
};

const SETTINGS_KEY = 'drive.accessibility.settings';
export const TEXT_SCALE_OPTIONS: readonly TextScaleOption[] = ['default', 'large', 'extraLarge'];

const textScaleMultiplier: Record<TextScaleOption, number> = {
  default: 1,
  large: 1.2,
  extraLarge: 1.4,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);
  const [textScale, setTextScale] = useState<TextScaleOption>('default');

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      const saved = await SecureStore.getItemAsync(SETTINGS_KEY);
      if (!isMounted || !saved) {
        return;
      }

      try {
        const parsed = JSON.parse(saved) as { highContrastEnabled?: boolean; textScale?: TextScaleOption };
        if (typeof parsed.highContrastEnabled === 'boolean') {
          setHighContrastEnabled(parsed.highContrastEnabled);
        }
        if (parsed.textScale && parsed.textScale in textScaleMultiplier) {
          setTextScale(parsed.textScale);
        }
      } catch {
        console.warn('Resetting invalid accessibility settings from storage.');
        await SecureStore.deleteItemAsync(SETTINGS_KEY);
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify({ highContrastEnabled, textScale }));
  }, [highContrastEnabled, textScale]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      highContrastEnabled,
      textScale,
      maxFontSizeMultiplier: textScaleMultiplier[textScale],
      setHighContrastEnabled,
      setTextScale,
    }),
    [highContrastEnabled, textScale]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

export const useAccessibilitySettings = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilitySettings must be used within AccessibilityProvider');
  }
  return context;
};
