import { describe, it, expect } from "vitest";
import {
  HEADER_PRESETS,
  FOOTER_PRESETS,
  ALL_HEADER_FOOTER_PRESETS,
  DEFAULT_LOGO_SRC,
  getPresetById,
  serializePreset,
  type HeaderFooterPreset,
} from "./presets";
import type { HeaderFooterBlock } from "./types";

/** Flatten every block, including those nested inside row columns. */
function flatten(blocks: HeaderFooterBlock[]): HeaderFooterBlock[] {
  const out: HeaderFooterBlock[] = [];
  for (const block of blocks) {
    out.push(block);
    const cols = (block.props as { columns?: Array<{ blocks?: HeaderFooterBlock[] }> })
      .columns;
    if (Array.isArray(cols)) {
      for (const col of cols) {
        if (Array.isArray(col.blocks)) out.push(...flatten(col.blocks));
      }
    }
  }
  return out;
}

function allBlocks(preset: HeaderFooterPreset): HeaderFooterBlock[] {
  return flatten(preset.blocks);
}

describe("header/footer starter presets", () => {
  it("ships exactly five headers and five footers", () => {
    expect(HEADER_PRESETS).toHaveLength(5);
    expect(FOOTER_PRESETS).toHaveLength(5);
    expect(ALL_HEADER_FOOTER_PRESETS).toHaveLength(10);
  });

  it("has unique preset ids and block ids", () => {
    const presetIds = ALL_HEADER_FOOTER_PRESETS.map((p) => p.id);
    expect(new Set(presetIds).size).toBe(presetIds.length);

    const blockIds = ALL_HEADER_FOOTER_PRESETS.flatMap((p) =>
      allBlocks(p).map((b) => b.id),
    );
    expect(new Set(blockIds).size).toBe(blockIds.length);
  });

  it("tags each preset with the matching type", () => {
    expect(HEADER_PRESETS.every((p) => p.type === "HEADER")).toBe(true);
    expect(FOOTER_PRESETS.every((p) => p.type === "FOOTER")).toBe(true);
  });

  it("uses the Abelo logo as the default logo everywhere", () => {
    const logos = ALL_HEADER_FOOTER_PRESETS.flatMap(allBlocks).filter(
      (b) => b.type === "logo",
    );
    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) {
      expect((logo.props as { src?: string }).src).toBe(DEFAULT_LOGO_SRC);
    }
  });

  it("only ever pins headers — footers are never fixed/sticky", () => {
    for (const footer of FOOTER_PRESETS) {
      expect(footer.containerSettings.sticky ?? "none").toBe("none");
      const rowSticky = allBlocks(footer)
        .filter((b) => b.type === "row")
        .map((b) => (b.props as { sticky?: string }).sticky ?? "none");
      expect(rowSticky.every((s) => s === "none")).toBe(true);
    }

    const pinnedHeaders = HEADER_PRESETS.filter(
      (p) => p.containerSettings.sticky === "top",
    );
    expect(pinnedHeaders.length).toBeGreaterThan(0);
    expect(pinnedHeaders.length).toBeLessThan(HEADER_PRESETS.length);
  });

  it("serializes to a parsable { blocks, containerSettings } payload", () => {
    for (const preset of ALL_HEADER_FOOTER_PRESETS) {
      const parsed = JSON.parse(serializePreset(preset)) as {
        blocks: HeaderFooterBlock[];
        containerSettings: { width?: string };
      };
      expect(parsed.blocks).toHaveLength(preset.blocks.length);
      expect(parsed.containerSettings.width).toBe(preset.containerSettings.width);
    }
  });

  it("resolves presets by id", () => {
    expect(getPresetById("preset-header-classic")?.type).toBe("HEADER");
    expect(getPresetById("preset-footer-neon-grid")?.type).toBe("FOOTER");
    expect(getPresetById("does-not-exist")).toBeUndefined();
  });

  it("defines an explicit mobile span for every column (no accidental full-width stacking)", () => {
    for (const preset of ALL_HEADER_FOOTER_PRESETS) {
      const columns = preset.blocks.flatMap(
        (b) => (b.props as { columns?: Array<{ spanSm?: number }> }).columns ?? [],
      );
      expect(columns.length).toBeGreaterThan(0);
      for (const col of columns) {
        expect(typeof col.spanSm).toBe("number");
      }
    }
  });

  it("keeps header rows on a single line on mobile (logo + menu, actions hidden)", () => {
    for (const preset of HEADER_PRESETS) {
      const rows = preset.blocks.filter((b) => b.type === "row");
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect((row.props as { stackOnMobile?: boolean }).stackOnMobile).toBe(false);
      }

      // Logo (spanSm 8) + menu (spanSm 4) must fill exactly one 12-col row.
      const firstRowCols = (
        rows[0].props as { columns: Array<{ spanSm: number; blocks: HeaderFooterBlock[] }> }
      ).columns.slice(0, 2);
      const mobileRow = firstRowCols.reduce((sum, c) => sum + c.spanSm, 0);
      expect(mobileRow).toBe(12);
    }
  });
});
