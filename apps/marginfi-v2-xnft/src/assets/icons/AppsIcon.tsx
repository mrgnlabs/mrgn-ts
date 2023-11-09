import React from "react";

export const AppsIcon: React.FC<React.SVGAttributes<SVGElement>> = ({ width = 24, height = 24, color = "black" }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0h24v24H0V0z" fill="none" />
      <path
        d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"
        fill={color}
      />
    </svg>
  );
};
