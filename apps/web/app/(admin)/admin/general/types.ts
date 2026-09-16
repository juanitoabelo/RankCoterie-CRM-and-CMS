export type GeneralSettings = {
  siteTitle: string;
  tagline: string;
  siteIconUrl: string;
  siteUrl: string;
  adminEmail: string;
  membership: boolean;
  defaultRole: string;
  language: string;
  timezone: string;
  dateFormat: string;
  customDateFormat: string;
  timeFormat: string;
  customTimeFormat: string;
  weekStartsOn: string;
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  siteTitle: "",
  tagline: "",
  siteIconUrl: "",
  siteUrl: "",
  adminEmail: "",
  membership: false,
  defaultRole: "EDITOR",
  language: "en",
  timezone: "UTC+0",
  dateFormat: "F j, Y",
  customDateFormat: "",
  timeFormat: "g:i a",
  customTimeFormat: "",
  weekStartsOn: "Monday",
};

export const DATE_FORMAT_OPTIONS = [
  { label: "September 16, 2026", value: "F j, Y" },
  { label: "2026-09-16", value: "Y-m-d" },
  { label: "09/16/2026", value: "m/d/Y" },
  { label: "16/09/2026", value: "d/m/Y" },
  { label: "16.09.2026", value: "d.m.Y" },
];

export const TIME_FORMAT_OPTIONS = [
  { label: "4:53 am", value: "g:i a" },
  { label: "4:53 AM", value: "g:i A" },
  { label: "04:53", value: "H:i" },
];

export const TIMEZONE_OPTIONS = [
  "UTC-12", "UTC-11", "UTC-10", "UTC-9:30", "UTC-9",
  "UTC-8", "UTC-7", "UTC-6", "UTC-5", "UTC-4",
  "UTC-3:30", "UTC-3", "UTC-2", "UTC-1", "UTC+0",
  "UTC+1", "UTC+2", "UTC+3", "UTC+3:30", "UTC+4",
  "UTC+4:30", "UTC+5", "UTC+5:30", "UTC+5:45", "UTC+6",
  "UTC+6:30", "UTC+7", "UTC+8", "UTC+8:45", "UTC+9",
  "UTC+9:30", "UTC+10", "UTC+10:30", "UTC+11", "UTC+12",
  "UTC+12:45", "UTC+13", "UTC+14",
];

export const LANGUAGE_OPTIONS = [
  { label: "English (United States)", value: "en" },
  { label: "English (United Kingdom)", value: "en-GB" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Portuguese (Brazil)", value: "pt-BR" },
  { label: "Japanese", value: "ja" },
  { label: "Chinese (Simplified)", value: "zh-CN" },
];

export const WEEK_START_OPTIONS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export type GeneralActionResult = { ok: true } | { ok: false; error: string };
