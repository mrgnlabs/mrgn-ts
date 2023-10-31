import React from "react";

export const useOs = () => {
  const [isAndroid, setIsAndroid] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  React.useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    setIsAndroid(userAgent.indexOf("Android") > -1);
    setIsIOS(!!userAgent.match(/iPhone|iPad|iPod/i));
  }, []);

  return { isAndroid, isIOS };
};
