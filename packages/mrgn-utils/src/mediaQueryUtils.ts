import { FC } from "react";
import { useMediaQuery } from "react-responsive";

const Desktop: FC<{ children: any }> = ({ children }) => {
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  return isDesktop ? children : null;
};

const Mobile: FC<{ children: any }> = ({ children }) => {
  const isMobile = useMediaQuery({ maxWidth: 1024 });
  return isMobile ? children : null;
};

export { Desktop, Mobile };
