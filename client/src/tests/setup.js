import '@testing-library/jest-dom/vitest';

// Some jsdom/Vitest combinations expose window.localStorage but not the global
// binding used by the token store. Provide a minimal in-memory implementation.
if (!globalThis.localStorage) {
  const items = new Map();
  globalThis.localStorage = {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    clear: () => items.clear(),
    key: (index) => [...items.keys()][index] ?? null,
    get length() { return items.size; },
  };
}

// jsdom does not implement matchMedia, which Framer Motion/responsive hooks may use.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver ||= ResizeObserverMock;
