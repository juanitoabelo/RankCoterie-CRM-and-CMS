"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentGateway } from "@/app/(admin)/admin/payment-gateways/actions";
import { GATEWAY_FIELDS } from "./gatewayFields";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

function cfgStr(config: unknown, key: string): string {
  if (config && typeof config === "object" && key in config) {
    const value = (config as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return "";
}

function cfgBool(config: unknown, key: string): boolean {
  if (config && typeof config === "object" && key in config) {
    return (config as Record<string, unknown>)[key] === true;
  }
  return false;
}

export default function GatewayEditForm({
  id,
  gateway,
}: {
  id: string;
  gateway: {
    name: string;
    type: string;
    isEnabled: boolean;
    isTestMode: boolean;
    config: unknown;
  };
}) {
  const [type, setType] = useState(gateway.type);
  const [message, setMessage] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const fields = GATEWAY_FIELDS[type] ?? [];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await updatePaymentGateway(id, formData);
        if (result.ok) {
          setMessage({ ok: true });
          router.refresh();
        } else {
          setMessage({ ok: false, error: result.error });
        }
      } catch (err) {
        setMessage({ ok: false, error: err instanceof Error ? err.message : "Failed to update gateway." });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Gateway Settings
      </h2>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Gateway updated successfully." : message.error}
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label className={labelCls} htmlFor="gw-name">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="gw-name"
            type="text"
            name="name"
            required
            defaultValue={gateway.name}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="gw-type">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            id="gw-type"
            name="type"
            required
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setMessage(null);
            }}
            className={inputCls}
          >
            <option value="STRIPE">Stripe</option>
            <option value="PAYPAL">PayPal</option>
            <option value="SQUARE">Square</option>
            <option value="MANUAL">Manual / Cash on Delivery</option>
          </select>
        </div>

        {fields.map((field) =>
          field.checkbox ? (
            <label key={field.name} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name={field.name}
                defaultChecked={cfgBool(gateway.config, field.name)}
                className="h-4 w-4 rounded border-zinc-400"
              />
              {field.label}
            </label>
          ) : (
            <div key={field.name}>
              <label className={labelCls} htmlFor={`gw-${field.name}`}>
                {field.label}
              </label>
              <input
                id={`gw-${field.name}`}
                type={field.type}
                name={field.name}
                defaultValue={cfgStr(gateway.config, field.name)}
                className={inputCls}
                placeholder={field.placeholder}
              />
            </div>
          ),
        )}

        {type === "MANUAL" && (
          <p className="text-xs text-zinc-500">
            Manual gateways require no API credentials — orders are marked for offline payment.
          </p>
        )}

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="isEnabled"
            defaultChecked={gateway.isEnabled}
            className="h-4 w-4 rounded border-zinc-400"
          />
          Enabled
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/products/payment-gateway")}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Back to list
          </button>
        </div>
      </div>
    </form>
  );
}
