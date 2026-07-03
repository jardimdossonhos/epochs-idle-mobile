import { vi } from 'vitest';

let store: Record<string, string> = {};

const AsyncStorageMock = {
  getItem: vi.fn(async (key: string) => {
    return store[key] || null;
  }),
  setItem: vi.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn(async (key: string) => {
    delete store[key];
  }),
  clear: vi.fn(async () => {
    store = {};
  }),
  // Helper for test verification / setup
  _getStore: () => store,
  _setStore: (newStore: Record<string, string>) => {
    store = { ...newStore };
  },
};

export default AsyncStorageMock;
