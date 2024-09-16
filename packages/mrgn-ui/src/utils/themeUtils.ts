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
