import { useEffect, useState } from "react";

export function useIsWindowLoaded() {
  const [isWindowLoaded, setIsWindowLoaded] = useState<boolean>(false);
  useEffect(() => {
    console.log({ doc: document.readyState });
    if (document.readyState === "complete") {
      setIsWindowLoaded(true);
      console.log("window.xnft");
      console.log(window.xnft);
    }
  }, [document]);

  return isWindowLoaded;
}
