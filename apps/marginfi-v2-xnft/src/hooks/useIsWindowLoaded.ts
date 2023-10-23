import { useEffect, useState } from "react";

export function useIsWindowLoaded() {
  const [isWindowLoaded, setIsWindowLoaded] = useState<boolean>(false);
  useEffect(() => {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setIsWindowLoaded(true);
    }
  }, [document.readyState]);

  return isWindowLoaded;
}
