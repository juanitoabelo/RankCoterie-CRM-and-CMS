"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import {
  DEFAULT_THEME_SETTINGS,
  THEME_PRESETS,
  type ThemeSettings,
} from "@/lib/theme-settings";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Read the tenant's theme settings (falls back to defaults). */
export async function getThemeSettings(): Promise<ThemeSettings> {
  await requireSection("themeSettings");
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as { themeSettings?: Partial<ThemeSettings> };
  return {
    ...DEFAULT_THEME_SETTINGS,
    ...theme.themeSettings,
    colors: { ...DEFAULT_THEME_SETTINGS.colors, ...theme.themeSettings?.colors },
    fonts: {
      ...DEFAULT_THEME_SETTINGS.fonts,
      ...theme.themeSettings?.fonts,
      sizes: {
        mobile: { ...DEFAULT_THEME_SETTINGS.fonts.sizes.mobile, ...theme.themeSettings?.fonts?.sizes?.mobile },
        tablet: { ...DEFAULT_THEME_SETTINGS.fonts.sizes.tablet, ...theme.themeSettings?.fonts?.sizes?.tablet },
        desktop: { ...DEFAULT_THEME_SETTINGS.fonts.sizes.desktop, ...theme.themeSettings?.fonts?.sizes?.desktop },
      },
    },
    layout: { ...DEFAULT_THEME_SETTINGS.layout, ...theme.themeSettings?.layout },
    responsive: {
      breakpoints: { ...DEFAULT_THEME_SETTINGS.responsive.breakpoints, ...theme.themeSettings?.responsive?.breakpoints },
      containerPadding: { ...DEFAULT_THEME_SETTINGS.responsive.containerPadding, ...theme.themeSettings?.responsive?.containerPadding },
    },
  };
}

/** Apply a preset theme. */
export async function applyPreset(presetId: string): Promise<ActionResult> {
  const actor = await requireSection("themeSettings");
  const preset = THEME_PRESETS.find((p) => p.id === presetId);
  if (!preset) return { ok: false, error: "Preset not found." };

  const existing = await getThemeSettings();
  const settings: ThemeSettings = {
    ...existing,
    activePreset: presetId,
    colors: preset.colors,
    fonts: {
      ...existing.fonts,
      heading: preset.fonts.heading,
      body: preset.fonts.body,
      mono: preset.fonts.mono,
    },
    layout: preset.layout,
  };

  return saveThemeSettingsToDb(settings, actor.id);
}

/** Save the full theme settings from form data. */
export async function saveThemeSettings(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("themeSettings");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string, fallback: number) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };

  const settings: ThemeSettings = {
    activePreset: str("activePreset") || null,
    colors: {
      background: str("colorBackground") || DEFAULT_THEME_SETTINGS.colors.background,
      text: str("colorText") || DEFAULT_THEME_SETTINGS.colors.text,
      accent: str("colorAccent") || DEFAULT_THEME_SETTINGS.colors.accent,
      headingColor: str("colorHeading") || DEFAULT_THEME_SETTINGS.colors.headingColor,
      linkColor: str("colorLink") || DEFAULT_THEME_SETTINGS.colors.linkColor,
      linkHoverColor: str("colorLinkHover") || DEFAULT_THEME_SETTINGS.colors.linkHoverColor,
      buttonBg: str("colorButtonBg") || DEFAULT_THEME_SETTINGS.colors.buttonBg,
      buttonText: str("colorButtonText") || DEFAULT_THEME_SETTINGS.colors.buttonText,
      surface: str("colorSurface") || DEFAULT_THEME_SETTINGS.colors.surface,
      border: str("colorBorder") || DEFAULT_THEME_SETTINGS.colors.border,
      muted: str("colorMuted") || DEFAULT_THEME_SETTINGS.colors.muted,
      success: str("colorSuccess") || DEFAULT_THEME_SETTINGS.colors.success,
      warning: str("colorWarning") || DEFAULT_THEME_SETTINGS.colors.warning,
      error: str("colorError") || DEFAULT_THEME_SETTINGS.colors.error,
    },
    fonts: {
      heading: str("fontHeading") || DEFAULT_THEME_SETTINGS.fonts.heading,
      body: str("fontBody") || DEFAULT_THEME_SETTINGS.fonts.body,
      mono: str("fontMono") || DEFAULT_THEME_SETTINGS.fonts.mono,
      sizes: {
        mobile: {
          h1: num("mobileH1", DEFAULT_THEME_SETTINGS.fonts.sizes.mobile.h1),
          h2: num("mobileH2", DEFAULT_THEME_SETTINGS.fonts.sizes.mobile.h2),
          h3: num("mobileH3", DEFAULT_THEME_SETTINGS.fonts.sizes.mobile.h3),
          h4: num("mobileH4", DEFAULT_THEME_SETTINGS.fonts.sizes.mobile.h4),
          body: num("mobileBody", DEFAULT_THEME_SETTINGS.fonts.sizes.mobile.body),
          small: num("mobileSmall", DEFAULT_THEME_SETTINGS.fonts.sizes.mobile.small),
        },
        tablet: {
          h1: num("tabletH1", DEFAULT_THEME_SETTINGS.fonts.sizes.tablet.h1),
          h2: num("tabletH2", DEFAULT_THEME_SETTINGS.fonts.sizes.tablet.h2),
          h3: num("tabletH3", DEFAULT_THEME_SETTINGS.fonts.sizes.tablet.h3),
          h4: num("tabletH4", DEFAULT_THEME_SETTINGS.fonts.sizes.tablet.h4),
          body: num("tabletBody", DEFAULT_THEME_SETTINGS.fonts.sizes.tablet.body),
          small: num("tabletSmall", DEFAULT_THEME_SETTINGS.fonts.sizes.tablet.small),
        },
        desktop: {
          h1: num("desktopH1", DEFAULT_THEME_SETTINGS.fonts.sizes.desktop.h1),
          h2: num("desktopH2", DEFAULT_THEME_SETTINGS.fonts.sizes.desktop.h2),
          h3: num("desktopH3", DEFAULT_THEME_SETTINGS.fonts.sizes.desktop.h3),
          h4: num("desktopH4", DEFAULT_THEME_SETTINGS.fonts.sizes.desktop.h4),
          body: num("desktopBody", DEFAULT_THEME_SETTINGS.fonts.sizes.desktop.body),
          small: num("desktopSmall", DEFAULT_THEME_SETTINGS.fonts.sizes.desktop.small),
        },
      },
    },
    layout: {
      maxWidth: str("layoutMaxWidth") || DEFAULT_THEME_SETTINGS.layout.maxWidth,
      containerPadding: str("layoutContainerPadding") || DEFAULT_THEME_SETTINGS.layout.containerPadding,
      headerStyle: (str("layoutHeaderStyle") as ThemeSettings["layout"]["headerStyle"]) || DEFAULT_THEME_SETTINGS.layout.headerStyle,
      footerStyle: (str("layoutFooterStyle") as ThemeSettings["layout"]["footerStyle"]) || DEFAULT_THEME_SETTINGS.layout.footerStyle,
      sidebarPosition: (str("layoutSidebarPosition") as ThemeSettings["layout"]["sidebarPosition"]) || DEFAULT_THEME_SETTINGS.layout.sidebarPosition,
      contentSpacing: (str("layoutContentSpacing") as ThemeSettings["layout"]["contentSpacing"]) || DEFAULT_THEME_SETTINGS.layout.contentSpacing,
    },
    responsive: {
      breakpoints: {
        mobile: num("bpMobile", DEFAULT_THEME_SETTINGS.responsive.breakpoints.mobile),
        tablet: num("bpTablet", DEFAULT_THEME_SETTINGS.responsive.breakpoints.tablet),
        desktop: num("bpDesktop", DEFAULT_THEME_SETTINGS.responsive.breakpoints.desktop),
      },
      containerPadding: {
        mobile: str("cpMobile") || DEFAULT_THEME_SETTINGS.responsive.containerPadding.mobile,
        tablet: str("cpTablet") || DEFAULT_THEME_SETTINGS.responsive.containerPadding.tablet,
        desktop: str("cpDesktop") || DEFAULT_THEME_SETTINGS.responsive.containerPadding.desktop,
      },
    },
  };

  return saveThemeSettingsToDb(settings, actor.id);
}

async function saveThemeSettingsToDb(settings: ThemeSettings, actorId: string): Promise<ActionResult> {
  try {
    const tenant = await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: "Canopy", domainKey: "canopy.local" },
    });
    const theme = (tenant.theme ?? {}) as Record<string, unknown>;
    await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: {
        theme: {
          ...theme,
          themeSettings: settings,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit({ action: "THEME_SETTINGS_UPDATE", entity: "Tenant", entityId: TENANT_ID, actorId });
    revalidatePath("/admin/theme-settings");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save theme settings.",
    };
  }
}

/** Server action wrapper for form submission. */
export async function saveThemeSettingsForm(formData: FormData): Promise<void> {
  await saveThemeSettings(formData);
}

/** Server action wrapper for preset application. */
export async function applyPresetForm(formData: FormData): Promise<void> {
  const presetId = String(formData.get("presetId") ?? "");
  await applyPreset(presetId);
}
