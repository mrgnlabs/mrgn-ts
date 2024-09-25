import React from "react";

export const useOs = () => {
  const [isAndroid, setIsAndroid] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isPWA, setIsPWA] = React.useState(false);
  React.useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isPWA = window.matchMedia("(display-mode: standalone)").matches;
    setIsAndroid(userAgent.indexOf("Android") > -1);
    setIsIOS(
      !!/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
    setIsPWA(isPWA);
  }, []);
  const isPhone = React.useMemo(() => isIOS || isAndroid || isPWA, [isIOS, isAndroid, isPWA]);

  return { isAndroid, isIOS, isPWA, isPhone };
};
