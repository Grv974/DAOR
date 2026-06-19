import type { OptionColor } from '@/types';

// Tailwind classes for select-option pills, light + dark.
export const OPTION_COLORS: Record<OptionColor, string> = {
  gray: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100',
  brown: 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100',
  orange: 'bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100',
  yellow: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100',
  green: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
  blue: 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100',
  purple: 'bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100',
  pink: 'bg-pink-200 text-pink-900 dark:bg-pink-800 dark:text-pink-100',
  red: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100',
};

export const COLOR_KEYS = Object.keys(OPTION_COLORS) as OptionColor[];

export function pickColor(seed: number): OptionColor {
  return COLOR_KEYS[seed % COLOR_KEYS.length];
}
