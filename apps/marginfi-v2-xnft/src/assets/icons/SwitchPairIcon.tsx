import React from "react";

export const SwitchPairIcon: React.FC<React.SVGAttributes<SVGElement>> = ({ width = 18, height = 18 }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.04393 5.74021L12 3.3701L9.04393 1V2.68839H1.0228V4.05189H9.04393V5.74021ZM2.95607 5.34607L0 7.71617L2.95607 10.0863V8.39789H10.9772V7.03439H2.95607V5.34607Z"
        fill="white"
        fillOpacity="0.5"
      />
    </svg>
  );
};
