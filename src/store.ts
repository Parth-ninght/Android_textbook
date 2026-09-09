import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      let item = null;
      if (typeof window !== 'undefined' && (window as any).plus && (window as any).plus.storage) {
        item = (window as any).plus.storage.getItem(key);
        if (!item) {
          // Fallback to localStorage and migrate
          item = window.localStorage.getItem(key);
          if (item) {
            (window as any).plus.storage.setItem(key, item);
          }
        }
      } else {
        item = window.localStorage.getItem(key);
      }
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue(prev => {
        try {
          const valueToStore = value instanceof Function ? value(prev) : value;
          if (Object.is(valueToStore, prev)) {
            return prev;
          }
          const stringValue = JSON.stringify(valueToStore);

          if (typeof window !== 'undefined' && (window as any).plus && (window as any).plus.storage) {
            (window as any).plus.storage.setItem(key, stringValue);
          }
          // Always write to localStorage as a fallback
          window.localStorage.setItem(key, stringValue);
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
