import { Fragment } from "react";
import {
  intakeFieldsFor,
  type LeadIntakeField,
  type LeadIntakeSectionKey,
} from "@/modules/leads";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";
const selectCls = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

const YES_NO_OPTIONS = [
  { value: "", label: "— select —" },
  { value: "0", label: "No" },
  { value: "1", label: "Yes" },
];

function storedAsOption(field: LeadIntakeField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (field.type === "yesno") {
    return value === true || value === "true" || value === 1 || value === "1" ? "1" : "0";
  }
  const asString = String(value);
  return (field.options ?? []).includes(asString) ? asString : "";
}

function IntakeField({ field, value }: { field: LeadIntakeField; value: unknown }) {
  const label = (
    <span className="text-zinc-600">{field.label}</span>
  );

  if (field.type === "yesno") {
    return (
      <label className="block text-sm">
        {label}
        <select name={field.key} defaultValue={storedAsOption(field, value)} className={selectCls}>
          {YES_NO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block text-sm">
        {label}
        <select name={field.key} defaultValue={storedAsOption(field, value)} className={selectCls}>
          <option value="">— select —</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className={`block text-sm ${field.wide ? "sm:col-span-2" : ""}`}>
        {label}
        <textarea
          name={field.key}
          rows={3}
          defaultValue={typeof value === "string" ? value : value == null ? "" : String(value)}
          placeholder={field.placeholder}
          className={inputCls}
        />
      </label>
    );
  }

  const type = field.type === "date" ? "date" : field.type === "number" ? "number" : "text";
  return (
    <label className="block text-sm">
      {label}
      <input
        type={type}
        name={field.key}
        defaultValue={typeof value === "string" ? value : value == null ? "" : String(value)}
        placeholder={field.placeholder}
        className={inputCls}
      />
    </label>
  );
}

/**
 * All intake fields for one legacy section, rendered as grid children.
 * Dividers are inserted where the schema starts a new visual group.
 * `values` prefills the inputs (lead detail page); omit it for a blank form.
 */
export function IntakeSectionFields({
  section,
  values,
}: {
  section: LeadIntakeSectionKey;
  values?: Record<string, unknown>;
}) {
  const fields = intakeFieldsFor(section);
  return (
    <>
      {fields.map((field, index) => {
        const group = field.group ?? 0;
        const previousGroup = index > 0 ? (fields[index - 1].group ?? 0) : null;
        const divider = previousGroup !== null && previousGroup !== group;
        return (
          <Fragment key={field.key}>
            {divider && <div className="sm:col-span-2 border-t border-zinc-200 pt-4" />}
            <IntakeField field={field} value={values?.[field.key]} />
          </Fragment>
        );
      })}
    </>
  );
}
