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
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (event: any) => {
      isLongPress.current = false;
      isCancelled.current = false;
      if (event.touches && event.touches[0]) {
        startPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      } else if (event.clientX !== undefined) {
        startPos.current = { x: event.clientX, y: event.clientY };
      } else {
        startPos.current = null;
      }

      timeout.current = setTimeout(() => {
        isLongPress.current = true;
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
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
      startPos.current = null;
    },
    [onClick]
  );

  const move = useCallback((event: any) => {
    if (!startPos.current) return;
    const currentX = event.touches?.[0]?.clientX ?? event.clientX;
    const currentY = event.touches?.[0]?.clientY ?? event.clientY;
    if (currentX === undefined || currentY === undefined) return;

    const diffX = Math.abs(currentX - startPos.current.x);
    const diffY = Math.abs(currentY - startPos.current.y);

    // Allow natural finger jitter of up to 10 pixels before cancelling long press
    if (diffX > 10 || diffY > 10) {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      isCancelled.current = true;
    }
  }, []);

  const cancel = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    isCancelled.current = true;
    startPos.current = null;
  }, []);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onTouchEnd: clear,
    onMouseLeave: cancel,
    onTouchMove: move,
    onMouseMove: move
  };
}
