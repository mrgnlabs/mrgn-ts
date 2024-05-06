import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getVideoUrl(videoId: string) {
  return `https://storage.googleapis.com/mrgn-public/videos/${videoId}.mp4`;
}
