import { useState, useEffect } from 'react';

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

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      const stringValue = JSON.stringify(valueToStore);
      
      if (typeof window !== 'undefined' && (window as any).plus && (window as any).plus.storage) {
        (window as any).plus.storage.setItem(key, stringValue);
      }
      // Always write to localStorage as a fallback
      window.localStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
