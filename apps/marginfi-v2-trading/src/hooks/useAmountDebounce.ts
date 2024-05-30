import { useEffect, useState } from "react";

export function useAmountDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    if (value && value !== 0) {
      const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

      return () => {
        clearTimeout(timer);
      };
    } else {
      setDebouncedValue(value);
    }
  }, [value, delay]);

  return debouncedValue;
}
