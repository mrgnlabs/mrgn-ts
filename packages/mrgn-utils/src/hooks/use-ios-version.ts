import { useState, useEffect } from "react";

interface IOSVersion {
  major: number;
  minor: number;
  patch: number;
}

export const useIOSVersion = (): IOSVersion | null => {
  const [iosVersion, setIOSVersion] = useState<IOSVersion | null>(null);

  useEffect(() => {
    const getIOSVersion = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any)?.opera;

      // Check if the device is running iOS
      if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any)?.MSStream) {
        // Extract the iOS version
        const iOSMatch = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
        if (iOSMatch) {
          const majorVersion = parseInt(iOSMatch[1], 10);
          const minorVersion = parseInt(iOSMatch[2], 10);
          const patchVersion = parseInt(iOSMatch[3] || "0", 10);
          setIOSVersion({ major: majorVersion, minor: minorVersion, patch: patchVersion });
        }
      }
    };

    getIOSVersion();
  }, []);

  return iosVersion;
};
