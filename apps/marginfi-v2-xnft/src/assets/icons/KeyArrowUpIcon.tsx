import React from "react";

export const KeyArrowUpIcon: React.FC<React.SVGAttributes<SVGElement>> = ({
  width = 24,
  height = 24,
  color = "white",
}) => {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0h24v24H0V0z" fill="none" />
      <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z" fill={color} />
    </svg>
  );
};
