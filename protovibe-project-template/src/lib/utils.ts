import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Configure tailwind-merge to recognize custom text sizes
// so it doesn't mistakenly strip them when text colors are applied.
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': ['text-tiny'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}
