import { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

export function useExitPrompt() {
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const isExitingRef = useRef(false);
  const showExitPromptRef = useRef(false);

  useEffect(() => {
    showExitPromptRef.current = showExitPrompt;
  }, [showExitPrompt]);

  useEffect(() => {
    // Push a dummy state so we can intercept the first back press at the root level
    if (!window.history.state?.isRoot) {
      window.history.pushState({ isRoot: true }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (isExitingRef.current) return;
      
      if (!window.history.state || (!window.history.state.isRoot && !window.history.state.isAppModal)) {
        if (showExitPromptRef.current) {
          setShowExitPrompt(false);
        } else {
          setShowExitPrompt(true);
        }
        window.history.pushState({ isRoot: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);

    let capacitorListener: any = null;
    const setupCapacitor = async () => {
      // Setup listener for Capacitor native app
      capacitorListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (isExitingRef.current) return;
        window.history.back(); // This will trigger the popstate above
      });
    };
    setupCapacitor();

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (capacitorListener) {
        capacitorListener.remove();
      }
    };
  }, []);

  const confirmExit = async () => {
    isExitingRef.current = true;
    try {
      await CapacitorApp.exitApp();
    } catch (e) {
      // In a normal browser, we just go back twice to actually exit
      window.history.go(-2);
    }
  };

  const cancelExit = () => {
    setShowExitPrompt(false);
  };

  return { showExitPrompt, confirmExit, cancelExit };
}
