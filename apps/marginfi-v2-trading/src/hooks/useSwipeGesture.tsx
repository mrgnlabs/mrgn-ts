import { useState, useEffect } from "react";

export function useSwipeGesture(cb: () => void) {
  const [startTouchX, setStartTouchX] = useState<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 20) {
        // 20px is an arbitrary width from the left
        setStartTouchX(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endTouchX = e.changedTouches[0].clientX;

      // If the touch ends more than 50 pixels from where it started, call the callback
      if (startTouchX && endTouchX - startTouchX > 50) {
        cb();
      }

      // Reset the starting touch position
      setStartTouchX(null);
    };

    // Attach the event listeners
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      // Clean up the event listeners
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [startTouchX, cb]);

  return; // this hook doesn't need to return anything, but you can return values if needed
}
