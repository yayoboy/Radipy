import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Mock localStorage for jsdom test environment
const localStorageMock = (() => {
  let store = {};
  return {
    get length() { return Object.keys(store).length; },
    key(index) { return Object.keys(store)[index] ?? null; },
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});
