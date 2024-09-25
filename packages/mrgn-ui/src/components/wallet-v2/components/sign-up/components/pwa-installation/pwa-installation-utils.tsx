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
    title: "Download mobile app",
    description: "Download the marginfi mobile web app and sign in with email or social to get the best experience.",
    titleSize: "lg",
  },
];
