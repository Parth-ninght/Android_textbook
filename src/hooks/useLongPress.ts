import { useCallback, useRef } from 'react';

export function useLongPress(
  onLongPress: (e: any) => void,
  onClick: (e: any) => void,
  { delay = 500 } = {}
) {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const isCancelled = useRef(false);
  const lastClickTime = useRef(0);

  const start = useCallback(
    (event: any) => {
      isLongPress.current = false;
      isCancelled.current = false;
      timeout.current = setTimeout(() => {
        isLongPress.current = true;
        // Don't prevent default here as it blocks scrolling
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerClick && !isLongPress.current && !isCancelled.current) {
        // Prevent default only on touchEnd to stop synthetic click (ghost click)
        if (event.type === 'touchend' && event.cancelable) {
          event.preventDefault();
        }
        const now = Date.now();
        if (now - lastClickTime.current > 300) {
          lastClickTime.current = now;
          onClick(event);
        }
      }
    },
    [onClick]
  );

  const cancel = useCallback(() => {
    timeout.current && clearTimeout(timeout.current);
    isCancelled.current = true;
  }, []);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onTouchEnd: clear,
    onMouseLeave: cancel,
    onTouchMove: cancel,
    onMouseMove: cancel
  };
}
