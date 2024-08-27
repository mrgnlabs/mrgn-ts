import { FC } from "react";
import { useMediaQuery } from "react-responsive";

const Desktop: FC<{ children: any }> = ({ children }) => {
  const isDesktop = useMediaQuery({ minWidth: 1080 });
  return isDesktop ? children : null;
};

const Mobile: FC<{ children: any }> = ({ children }) => {
  const isMobile = useMediaQuery({ maxWidth: 1080 });
  return isMobile ? children : null;
};

export { Desktop, Mobile };
