import { useEffect, useState } from "react";

export { useColorScheme } from "react-native";

export function useDimensions(debounceMs = 0) {
  const [dimensions, setDimensions] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });

  useEffect(() => {
    const debounce = (fn: Function) => {
      let timer: ReturnType<typeof setTimeout>;
      return function () {
        clearTimeout(timer);
        timer = setTimeout(() => {
          clearTimeout(timer);
          // @ts-ignore
          fn.apply(this, arguments);
        }, debounceMs);
      };
    };

    setDimensions({
      height: window.innerHeight,
      width: window.innerWidth,
    });

    const debouncedHandleResize = debounce(function handleResize() {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    });

    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, [debounceMs]);

  return dimensions;
}
