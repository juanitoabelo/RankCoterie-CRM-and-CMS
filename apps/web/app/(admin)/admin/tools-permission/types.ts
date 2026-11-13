export type RoleOption = { role: string; label: string };

export type ToolItemData = {
  key: string;
  label: string;
  href: string;
  section: string;
};

export type ToolSectionData = {
  section: string;
  label: string;
  items: ToolItemData[];
};

export type ToolGroupData = {
  title: string;
  sections: ToolSectionData[];
};

export type PermissionMatrixData = {
  roles: RoleOption[];
  groups: ToolGroupData[];
  /** role -> section -> built-in default visibility */
  defaults: Record<string, Record<string, boolean>>;
  /** role -> target ("section:x" | "tool:y") -> explicit visibility */
  overrides: Record<string, Record<string, boolean>>;
};

export type PermissionEntry = { target: string; visible: boolean };

export type SaveResult = { ok: true } | { ok: false; error: string };
