import React from "react";

export const JupiterLogo: React.FC<React.SVGAttributes<SVGElement>> = ({ width = "24", height = "24" }) => {
  return <img src={"https://jup.ag/svg/jupiter-logo.svg"} width={width} height={height} alt="Jupiter aggregator" />;
};
