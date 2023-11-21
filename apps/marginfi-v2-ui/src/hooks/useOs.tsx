import React from "react";

export const useOs = () => {
  const [isAndroid, setIsAndroid] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isPWA, setIsPWA] = React.useState(false);
  React.useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isPWA = window.matchMedia("(display-mode: standalone)").matches;
    setIsAndroid(userAgent.indexOf("Android") > -1);
    setIsIOS(!!userAgent.match(/iPhone|iPad|iPod/i));
    setIsPWA(isPWA);
  }, []);

  return { isAndroid, isIOS, isPWA };
};
