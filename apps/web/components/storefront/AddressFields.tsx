"use client";

import type { ChangeEvent } from "react";

/**
 * Shared shipping/billing address inputs used by both checkout surfaces
 * (cart checkout and the product-page buy-now box). Country/state stay
 * controlled so the checkout can re-quote tax on change; everything else
 * is a plain named input read server-side from FormData.
 */
export type AddressFieldsProps = {
  idPrefix: string;
  namePrefix?: string;
  title?: string;
  hint?: string;
  country: string;
  state: string;
  onCountryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onBlur?: () => void;
};

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-zinc-600";
const fullRow = "sm:col-span-2";

export default function AddressFields({
  idPrefix,
  namePrefix = "",
  title = "Shipping address",
  hint = "Used for delivery and to calculate tax.",
  country,
  state,
  onCountryChange,
  onStateChange,
  onBlur,
}: AddressFieldsProps) {
  const handle =
    (set: (value: string) => void) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      set(e.target.value);

  return (
    <div className="mt-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-firstName`}>
            First name <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-firstName`}
            name={`${namePrefix}firstName`}
            type="text"
            required
            autoComplete="given-name"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-lastName`}>
            Last name <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-lastName`}
            name={`${namePrefix}lastName`}
            type="text"
            required
            autoComplete="family-name"
            className={inputCls}
          />
        </div>
        <div className={fullRow}>
          <label className={labelCls} htmlFor={`${idPrefix}-address1`}>
            Address <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-address1`}
            name={`${namePrefix}address1`}
            type="text"
            required
            autoComplete="address-line1"
            className={inputCls}
            placeholder="Street address"
          />
        </div>
        <div className={fullRow}>
          <label className={labelCls} htmlFor={`${idPrefix}-address2`}>
            Apartment, suite, etc. <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id={`${idPrefix}-address2`}
            name={`${namePrefix}address2`}
            type="text"
            autoComplete="address-line2"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-city`}>
            City <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-city`}
            name={`${namePrefix}city`}
            type="text"
            required
            autoComplete="address-level2"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-postcode`}>
            Postal code <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-postcode`}
            name={`${namePrefix}postcode`}
            type="text"
            required
            autoComplete="postal-code"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-country`}>
            Country / Region <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-country`}
            name={`${namePrefix}country`}
            type="text"
            required
            autoComplete="country-name"
            value={country}
            onChange={handle(onCountryChange)}
            onBlur={onBlur}
            className={inputCls}
            placeholder="e.g. US"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-state`}>
            State / Region
          </label>
          <input
            id={`${idPrefix}-state`}
            name={`${namePrefix}state`}
            type="text"
            autoComplete="address-level1"
            value={state}
            onChange={handle(onStateChange)}
            onBlur={onBlur}
            className={inputCls}
            placeholder="e.g. CA"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-company`}>
            Company <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id={`${idPrefix}-company`}
            name={`${namePrefix}company`}
            type="text"
            autoComplete="organization"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-phone`}>
            Phone <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id={`${idPrefix}-phone`}
            name={`${namePrefix}phone`}
            type="tel"
            autoComplete="tel"
            className={inputCls}
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-400">{hint}</p>
    </div>
  );
}
