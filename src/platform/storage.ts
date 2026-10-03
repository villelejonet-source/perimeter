import { Preferences } from '@capacitor/preferences';

/** Key/value JSON persistence. Never use raw localStorage (iOS may evict WebView storage). */
export interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Native: Capacitor Preferences (UserDefaults on iOS), survives WebView eviction. */
export class CapacitorStorage implements Storage {
  async get<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key });
    return value === null ? null : (JSON.parse(value) as T);
  }
  async set<T>(key: string, value: T): Promise<void> {
    await Preferences.set({ key, value: JSON.stringify(value) });
  }
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}

/** Web mock: in-memory, mirrored to IndexedDB so browser playtests survive a reload. */
export class WebStorage implements Storage {
  private readonly mem = new Map<string, string>();
  private readonly db: Promise<IDBDatabase | null>;

  constructor(dbName = 'perimeter-dev') {
    this.db = WebStorage.open(dbName);
  }

  private static open(name: string): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  private async tx(mode: IDBTransactionMode): Promise<IDBObjectStore | null> {
    const db = await this.db;
    return db ? db.transaction('kv', mode).objectStore('kv') : null;
  }

  async get<T>(key: string): Promise<T | null> {
    let raw = this.mem.get(key);
    if (raw === undefined) {
      const store = await this.tx('readonly');
      if (store) {
        raw = await new Promise<string | undefined>((resolve) => {
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result as string | undefined);
          req.onerror = () => resolve(undefined);
        });
        if (raw !== undefined) this.mem.set(key, raw);
      }
    }
    return raw === undefined ? null : (JSON.parse(raw) as T);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const raw = JSON.stringify(value);
    this.mem.set(key, raw);
    (await this.tx('readwrite'))?.put(raw, key);
  }

  async remove(key: string): Promise<void> {
    this.mem.delete(key);
    (await this.tx('readwrite'))?.delete(key);
  }
}
