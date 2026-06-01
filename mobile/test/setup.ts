import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: ({ children }: { children?: any }) => children ?? null,
    Text: ({ children }: { children?: any }) => children ?? null,
  },
  View: ({ children }: { children?: any }) => children ?? null,
  Text: ({ children }: { children?: any }) => children ?? null,
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: (updater: () => object) => updater(),
  withSpring: (value: number) => value,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children?: any }) => children ?? null,
  Gesture: {
    Pan: () => ({
      onUpdate() {
        return this;
      },
      onEnd() {
        return this;
      },
    }),
  },
}));

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 37.7749, longitude: -122.4194 } })),
}));
