declare module "*.svg" {
  import React from "react";
  import { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}

declare module "@env" {
  export const RPC_ENDPOINT_OVERRIDE: string;
  export const PUBLIC_BIRDEYE_API_KEY: string;
}
