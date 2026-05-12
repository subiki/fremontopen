import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the dark palette when no light key is set as default.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
