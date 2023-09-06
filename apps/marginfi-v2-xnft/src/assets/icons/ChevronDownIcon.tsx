import React from "react";

export const ChevronDownIcon: React.FC<React.SVGAttributes<SVGElement>> = ({ width = 24, height = 12 }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9L12 15L18 9" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
