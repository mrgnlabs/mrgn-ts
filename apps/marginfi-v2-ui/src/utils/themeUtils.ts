import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const titleCase = (str: string) => {
  return str.replace(/(?:^|\s)\w/g, function (match) {
    return match.toUpperCase();
  });
};

export const blendHexColors = (color1: string, color2: string, percentage: number): string => {
  // Ensure percentage is within 0-100 range
  percentage = Math.max(0, Math.min(percentage, 100));

  // Convert hex colors to RGB
  const color1Rgb = hexToRgb(color1);
  const color2Rgb = hexToRgb(color2);

  if (!color1Rgb || !color2Rgb) {
    throw new Error("Invalid hex color input.");
  }

  // Calculate the blended color
  const blendedRgb = {
    r: Math.round(color1Rgb.r + (color2Rgb.r - color1Rgb.r) * (percentage / 100)),
    g: Math.round(color1Rgb.g + (color2Rgb.g - color1Rgb.g) * (percentage / 100)),
    b: Math.round(color1Rgb.b + (color2Rgb.b - color1Rgb.b) * (percentage / 100)),
  };

  // Convert blended RGB color back to hex
  return rgbToHex(blendedRgb);
};

export const hexToRgb = (hex: string) => {
  // Remove leading '#' if present
  hex = hex.replace(/^#/, "");

  if (hex.length === 3) {
    // Expand shorthand form (e.g. '03F') to full form (e.g. '0033FF')
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (hex.length !== 6) {
    return null;
  }

  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
};

export const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }): string => {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
};
