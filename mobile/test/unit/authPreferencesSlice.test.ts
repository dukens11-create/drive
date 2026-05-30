import { authPreferencesReducer, setRememberMe } from '../../src/store/authPreferencesSlice';

describe('authPreferencesSlice', () => {
  test('defaults rememberMe to true', () => {
    const state = authPreferencesReducer(undefined, { type: 'unknown' });
    expect(state.rememberMe).toBe(true);
  });

  test('setRememberMe updates rememberMe preference', () => {
    const state = authPreferencesReducer({ rememberMe: true }, setRememberMe(false));
    expect(state.rememberMe).toBe(false);
  });
});
