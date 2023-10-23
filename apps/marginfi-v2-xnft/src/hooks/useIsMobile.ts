import { useEffect, useState } from "react";
import { useIsWindowLoaded } from "./useIsWindowLoaded";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>();
  const isWindowLoaded = useIsWindowLoaded();

  useEffect(() => {
    if (isWindowLoaded) {
      if (window?.xnft) {
        setIsMobile(false);
      } else {
        setIsMobile(true);
      }
    }
  }, [window?.xnft, isWindowLoaded]);

  return isMobile;
}
