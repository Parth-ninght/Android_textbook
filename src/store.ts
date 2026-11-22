import { useState, useCallback, useEffect, useRef } from 'react';
import { getIdbRecord, setIdbRecord } from './lib/idb';

const IDB_ONLY_SUFFIX = '__idb_only';
const TS_SUFFIX = '__ts';
const SYNC_EVENT = 'app-storage-sync';

function readSyncStorage<T>(key: string, initialValue: T): T {
  try {
    let item: string | null = null;
    const plus = typeof window !== 'undefined' ? (window as any).plus : undefined;
    if (plus?.storage) {
      item = plus.storage.getItem(key);
      if (!item && typeof window !== 'undefined') {
        item = window.localStorage.getItem(key);
        if (item) {
          try {
            plus.storage.setItem(key, item);
          } catch {
            // ignore plus storage quota error
          }
        }
      }
    } else if (typeof window !== 'undefined') {
      item = window.localStorage.getItem(key);
    }
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(error);
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => readSyncStorage(key, initialValue));
  const hasLocalWriteRef = useRef(false);
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    let cancelled = false;

    const hydrateFromIdb = async () => {
      const record = await getIdbRecord<T>(key);
      if (cancelled || hasLocalWriteRef.current || !record) return;

      let isIdbOnly = false;
      let hasLocalRaw = false;
      let localTs = 0;

      if (typeof window !== 'undefined') {
        try {
          isIdbOnly = window.localStorage.getItem(`${key}${IDB_ONLY_SUFFIX}`) === '1';
          hasLocalRaw = window.localStorage.getItem(key) !== null;
          localTs = Number(window.localStorage.getItem(`${key}${TS_SUFFIX}`) || '0');
        } catch {
          // ignore localStorage read errors
        }
      }

      if (isIdbOnly || !hasLocalRaw || record.ts > localTs) {
        setStoredValue(record.value);
      }
    };

    hydrateFromIdb();

    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string; value: T; sourceId: string }>;
      if (
        customEvent.detail?.key === key &&
        customEvent.detail?.sourceId !== instanceIdRef.current
      ) {
        hasLocalWriteRef.current = true;
        setStoredValue(customEvent.detail.value);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SYNC_EVENT, handleSync);
      return () => {
        cancelled = true;
        window.removeEventListener(SYNC_EVENT, handleSync);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue(prev => {
        try {
          const valueToStore = value instanceof Function ? value(prev) : value;
          if (Object.is(valueToStore, prev)) {
            return prev;
          }

          hasLocalWriteRef.current = true;
          const now = Date.now();
          const stringValue = JSON.stringify(valueToStore);

          // Always persist to IndexedDB so large images/audio survive even if localStorage quota is exceeded
          void setIdbRecord(key, valueToStore, now);

          const plus = typeof window !== 'undefined' ? (window as any).plus : undefined;
          if (plus?.storage) {
            try {
              plus.storage.setItem(key, stringValue);
            } catch (plusErr) {
              console.warn('plus.storage write failed:', plusErr);
            }
          }

          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(key, stringValue);
              window.localStorage.setItem(`${key}${TS_SUFFIX}`, String(now));
              window.localStorage.removeItem(`${key}${IDB_ONLY_SUFFIX}`);
            } catch (localErr) {
              // QuotaExceededError: keep data in IndexedDB and clear stale localStorage entry
              console.warn('localStorage quota exceeded, falling back to IndexedDB:', localErr);
              try {
                window.localStorage.removeItem(key);
                window.localStorage.setItem(`${key}${IDB_ONLY_SUFFIX}`, '1');
                window.localStorage.setItem(`${key}${TS_SUFFIX}`, String(now));
              } catch {
                // ignore secondary error
              }
            }

            queueMicrotask(() => {
              window.dispatchEvent(
                new CustomEvent(SYNC_EVENT, {
                  detail: { key, value: valueToStore, sourceId: instanceIdRef.current }
                })
              );
            });
          }

          return valueToStore;
        } catch (error) {
          console.error(error);
          return prev;
        }
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}
