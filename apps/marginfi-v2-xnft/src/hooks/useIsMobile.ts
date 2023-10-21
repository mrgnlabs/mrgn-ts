import { useEffect, useState } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>();
  useEffect(() => {
    console.log("a");
    if (window?.xnft) {
      console.log("b");
      setIsMobile(false);
    } else {
      console.log("c");
      setIsMobile(true);
    }
  }, [window?.xnft]);

  return isMobile;
}
