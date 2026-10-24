import '@testing-library/jest-dom/vitest';

// Node 25+ ships its own (file-backed, often undefined) localStorage global that
// shadows jsdom's. Install a spec-shaped in-memory Storage so tests are deterministic.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store = new Map();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

Object.setPrototypeOf(MemoryStorage.prototype, Storage.prototype);
Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), configurable: true });
