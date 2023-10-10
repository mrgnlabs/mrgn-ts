import React from "react";

export const BackIcon: React.FC<React.SVGAttributes<SVGElement>> = ({ width = 24, height = 24, color = "white" }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill={color}>
      <rect fill="none" height="24" width="24" />
      <g>
        <polygon points="17.77,3.77 16,2 6,12 16,22 17.77,20.23 9.54,12" />
      </g>
    </svg>
  );
};

export default BackIcon;
