export type CustomCssJsSettings = {
  customCss: string;
  customJs: string;
};

export type CustomCssActionResult = { ok: true } | { ok: false; error: string };

export const DEFAULT_CUSTOM_CSS_JS: CustomCssJsSettings = {
  customCss: "",
  customJs: "",
};