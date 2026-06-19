import { useEffect, useRef } from 'react';

type BackCallback = () => void;
const backCallbackStack: BackCallback[] = [];
let ignoreNextPopStateCount = 0;

// Global popstate listener
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e: PopStateEvent) => {
    if (ignoreNextPopStateCount > 0) {
      ignoreNextPopStateCount--;
      return;
    }
    // If there are callbacks in the stack, we pop the top one and execute it
    if (backCallbackStack.length > 0) {
      const cb = backCallbackStack.pop();
      if (cb) cb();
    }
  });
}

export function useHardwareBack(isOpen: boolean, close: () => void) {
  const closeRef = useRef(close);
  
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;

    const callback = () => {
      closeRef.current();
    };

    // Push state to history
    window.history.pushState({ isAppModal: true }, '');
    backCallbackStack.push(callback);

    return () => {
      const index = backCallbackStack.indexOf(callback);
      if (index !== -1) {
        backCallbackStack.splice(index, 1);
        // If the component unmounts or isOpen becomes false programmatically,
        // we need to pop the history state to keep it in sync.
        // Use setTimeout to avoid Strict Mode synchronous mount/unmount issues
        setTimeout(() => {
          if (window.history.state?.isAppModal) {
            ignoreNextPopStateCount++;
            window.history.back();
          }
        }, 0);
      }
    };
  }, [isOpen]);
}
