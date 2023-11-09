import React from "react";

export const ArrowUpIcon: React.FC<React.SVGAttributes<SVGElement>> = ({
  width = 24,
  height = 24,
  color = "white",
}) => {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0h24v24H0V0z" fill="none" />
      <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" fill={color} />
    </svg>
  );
};
