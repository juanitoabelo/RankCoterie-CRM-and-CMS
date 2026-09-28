"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { customFontOptions, type CustomFontFile, type FontFamilyOption } from "@/lib/custom-fonts";

/**
 * Every uploaded font, fetched once by the admin layout and shared with all
 * builder editors. Block editors are mounted deep in the tree (19 `BlockStyleTab`
 * call sites across four builders), so context beats prop-drilling here.
 */
const CustomFontContext = createContext<CustomFontFile[]>([]);

export function CustomFontProvider({
  fonts,
  children,
}: {
  fonts: CustomFontFile[];
  children: ReactNode;
}) {
  const value = useMemo(() => fonts, [fonts]);
  return <CustomFontContext.Provider value={value}>{children}</CustomFontContext.Provider>;
}

/** The tenant's uploaded fonts. Empty outside the admin shell. */
export function useCustomFonts(): CustomFontFile[] {
  return useContext(CustomFontContext);
}

/**
 * A built-in font list with the tenant's uploaded families appended. Custom
 * entries are dropped when their stack collides with a built-in (e.g. someone
 * uploads a family literally named "Inter") so option values stay unique.
 */
export function useFontFamilyOptions(base: readonly FontFamilyOption[]): FontFamilyOption[] {
  const fonts = useCustomFonts();
  return useMemo(() => {
    const seen = new Set(base.map((o) => o.value));
    return [...base, ...customFontOptions(fonts).filter((o) => !seen.has(o.value))];
  }, [base, fonts]);
}
