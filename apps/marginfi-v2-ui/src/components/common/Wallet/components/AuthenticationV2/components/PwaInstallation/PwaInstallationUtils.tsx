import * as screens from "./screens";

export type PwaScreen = {
  comp: React.FC<any>;
  title: string;
  description: string;
  titleSize: "lg" | "sm";
};

export const pwaFlow: PwaScreen[] = [
  {
    comp: screens.InstallPWA,
    title: "Install PWA",
    description: "to get the best experience on mobile...",
    titleSize: "lg",
  },
];
