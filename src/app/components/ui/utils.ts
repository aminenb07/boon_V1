import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// This function runs.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
