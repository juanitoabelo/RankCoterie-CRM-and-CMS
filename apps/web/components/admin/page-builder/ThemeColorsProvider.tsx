"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_GLOBAL_COLORS, type PaletteColor } from "@/lib/theme-colors";

const ThemeColorsContext = createContext<PaletteColor[]>(DEFAULT_GLOBAL_COLORS);

/**
 * Makes the site's global theme colors available to every block Style tab
 * without threading the palette through each builder/editor.
 *
 * Builders (and their edit pages) already load `themeColors`; wrapping the
 * builder in this provider lets `ElementStyleTab`, `BlockStyleTab`,
 * `BlockAdvancedTab` and `BackgroundFields` offer the same "global color"
 * choices everywhere. Falls back to `DEFAULT_GLOBAL_COLORS` when unset.
 */
export function ThemeColorsProvider({
  colors,
  children,
}: {
  colors?: PaletteColor[];
  children: ReactNode;
}) {
  const value = colors && colors.length > 0 ? colors : DEFAULT_GLOBAL_COLORS;
  return <ThemeColorsContext.Provider value={value}>{children}</ThemeColorsContext.Provider>;
}

export function useThemeColors(): PaletteColor[] {
  return useContext(ThemeColorsContext);
}
