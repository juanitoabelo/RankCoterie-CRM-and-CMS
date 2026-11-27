import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { decryptSecret, encryptSecret, secretEncryptionConfigured } from "@/modules/shared/secret-crypto";
import {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  DEFAULT_AI_PROVIDER,
  isAiProviderId,
  type AiProviderConfig,
  type AiProviderId,
  type AiProviderValueSource,
} from "./providers";

export interface AiProviderInput {
  apiKey?: string;
  clearKey?: boolean;
  model?: string;
  enabled?: boolean;
}

export interface AiProviderSettingsInput {
  primaryProvider?: AiProviderId;
  fallbackEnabled?: boolean;
  providers?: Partial<Record<AiProviderId, AiProviderInput>>;
}

export type AiProviderInputValidation =
  | { ok: true; input: AiProviderSettingsInput }
  | { ok: false; error: string };

export interface AiProviderView {
  configured: boolean;
  source: AiProviderValueSource;
  model: string;
  enabled: boolean;
}

export interface AiProviderSettingsView {
  primaryProvider: AiProviderId;
  fallbackEnabled: boolean;
  encryptionConfigured: boolean;
  providers: Record<AiProviderId, AiProviderView>;
}

export interface AiRuntimeSettings {
  primaryProvider: AiProviderId;
  fallbackEnabled: boolean;
}

export interface ResolvedAiProviderConfig extends Omit<AiProviderConfig, "apiKey"> {
  apiKey: string | null;
  enabled: boolean;
  source: AiProviderValueSource;
}

const MAX_KEY_LENGTH = 1000;
const MAX_MODEL_LENGTH = 120;

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function envValue(names: readonly string[]): string | null {
  for (const name of names) {
    const value = clean(process.env[name]);
    if (value) return value;
  }
  return null;
}

function validateProviderInput(value: unknown): AiProviderInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const input: AiProviderInput = {};

  if ("apiKey" in record) {
    if (typeof record.apiKey !== "string" || record.apiKey.length > MAX_KEY_LENGTH) return null;
    input.apiKey = record.apiKey;
  }
  if ("clearKey" in record) {
    if (typeof record.clearKey !== "boolean") return null;
    input.clearKey = record.clearKey;
  }
  if ("model" in record) {
    if (typeof record.model !== "string" || record.model.length > MAX_MODEL_LENGTH) return null;
    input.model = record.model;
  }
  if ("enabled" in record) {
    if (typeof record.enabled !== "boolean") return null;
    input.enabled = record.enabled;
  }

  return input;
}

export function validateAiProviderSettingsInput(value: unknown): AiProviderInputValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Invalid AI provider settings." };
  }

  const record = value as Record<string, unknown>;
  const input: AiProviderSettingsInput = {};

  if ("primaryProvider" in record) {
    if (!isAiProviderId(record.primaryProvider)) {
      return { ok: false, error: "Choose a valid AI provider." };
    }
    input.primaryProvider = record.primaryProvider;
  }

  if ("fallbackEnabled" in record) {
    if (typeof record.fallbackEnabled !== "boolean") {
      return { ok: false, error: "Invalid fallback setting." };
    }
    input.fallbackEnabled = record.fallbackEnabled;
  }

  if ("providers" in record) {
    if (!record.providers || typeof record.providers !== "object" || Array.isArray(record.providers)) {
      return { ok: false, error: "Invalid AI provider settings." };
    }
    const providers: Partial<Record<AiProviderId, AiProviderInput>> = {};
    for (const [key, providerValue] of Object.entries(record.providers as Record<string, unknown>)) {
      if (!isAiProviderId(key)) return { ok: false, error: "Invalid AI provider settings." };
      const providerInput = validateProviderInput(providerValue);
      if (!providerInput) return { ok: false, error: "Invalid AI provider settings." };
      providers[key] = providerInput;
    }
    input.providers = providers;
  }

  return { ok: true, input };
}

async function loadGlobalSettings(): Promise<AiRuntimeSettings> {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
    const theme = (tenant?.theme ?? {}) as {
      aiSettings?: { primaryProvider?: unknown; fallbackEnabled?: unknown };
    };
    return {
      primaryProvider: isAiProviderId(theme.aiSettings?.primaryProvider)
        ? theme.aiSettings.primaryProvider
        : DEFAULT_AI_PROVIDER,
      fallbackEnabled:
        typeof theme.aiSettings?.fallbackEnabled === "boolean"
          ? theme.aiSettings.fallbackEnabled
          : true,
    };
  } catch {
    return { primaryProvider: DEFAULT_AI_PROVIDER, fallbackEnabled: true };
  }
}

type ProviderRecord = Awaited<ReturnType<typeof prisma.aiProviderSetting.findUnique>>;

async function loadProviderRecord(provider: AiProviderId): Promise<ProviderRecord> {
  try {
    return await prisma.aiProviderSetting.findUnique({
      where: { tenantId_provider: { tenantId: TENANT_ID, provider } },
    });
  } catch {
    return null;
  }
}

async function loadProviderRecords(): Promise<NonNullable<ProviderRecord>[]> {
  try {
    return await prisma.aiProviderSetting.findMany({ where: { tenantId: TENANT_ID } });
  } catch {
    return [];
  }
}

export async function getAiRuntimeSettings(): Promise<AiRuntimeSettings> {
  return loadGlobalSettings();
}

export async function resolveAiProviderConfig(
  provider: AiProviderId,
): Promise<ResolvedAiProviderConfig> {
  const definition = AI_PROVIDERS[provider];
  const record = await loadProviderRecord(provider);

  let savedKey: string | null = null;
  if (record?.apiKeyEncrypted) {
    try {
      savedKey = clean(decryptSecret(record.apiKeyEncrypted));
    } catch {
      savedKey = null;
    }
  }

  const environmentKey = envValue(definition.envKeyNames);
  const apiKey = savedKey ?? environmentKey;
  const model =
    clean(record?.model) ?? envValue(definition.envModelNames) ?? definition.defaultModel;

  return {
    apiKey,
    model,
    enabled: record?.enabled ?? true,
    source: savedKey ? "saved" : environmentKey ? "environment" : null,
  };
}

export async function getAiProviderSettingsView(): Promise<AiProviderSettingsView> {
  const [globalSettings, records] = await Promise.all([loadGlobalSettings(), loadProviderRecords()]);
  const providers = {} as Record<AiProviderId, AiProviderView>;

  for (const provider of AI_PROVIDER_IDS) {
    const record = records.find((item) => item.provider === provider);
    const saved = Boolean(clean(record?.apiKeyEncrypted));
    const environment = Boolean(envValue(AI_PROVIDERS[provider].envKeyNames));
    providers[provider] = {
      configured: saved || environment,
      source: saved ? "saved" : environment ? "environment" : null,
      model:
        clean(record?.model) ??
        envValue(AI_PROVIDERS[provider].envModelNames) ??
        AI_PROVIDERS[provider].defaultModel,
      enabled: record?.enabled ?? true,
    };
  }

  return {
    ...globalSettings,
    encryptionConfigured: secretEncryptionConfigured(),
    providers,
  };
}

export async function saveAiProviderSettings(value: unknown): Promise<void> {
  const validation = validateAiProviderSettingsInput(value);
  if (!validation.ok) throw new Error(validation.error);

  const { primaryProvider, fallbackEnabled, providers } = validation.input;
  const storesKey = Object.values(providers ?? {}).some((provider) => clean(provider?.apiKey));
  if (storesKey && !secretEncryptionConfigured()) {
    throw new Error("Set AI_TOKEN_ENCRYPTION_KEY or SESSION_SECRET before saving API keys.");
  }

  await prisma.$transaction(async (tx) => {
    for (const provider of AI_PROVIDER_IDS) {
      const input = providers?.[provider];
      if (!input) continue;

      const create: Prisma.AiProviderSettingUncheckedCreateInput = {
        tenantId: TENANT_ID,
        provider,
      };
      const update: Prisma.AiProviderSettingUncheckedUpdateInput = {};

      if ("enabled" in input && typeof input.enabled === "boolean") {
        create.enabled = input.enabled;
        update.enabled = input.enabled;
      }

      if ("model" in input && typeof input.model === "string") {
        const model = clean(input.model);
        create.model = model;
        update.model = model;
      }

      const key = clean(input.apiKey);
      if (key) {
        const encrypted = encryptSecret(key);
        create.apiKeyEncrypted = encrypted;
        update.apiKeyEncrypted = encrypted;
      } else if (input.clearKey) {
        create.apiKeyEncrypted = null;
        update.apiKeyEncrypted = null;
      }

      if (!Object.keys(update).length) continue;
      await tx.aiProviderSetting.upsert({
        where: { tenantId_provider: { tenantId: TENANT_ID, provider } },
        create,
        update,
      });
    }

    if (primaryProvider === undefined && fallbackEnabled === undefined) return;

    const tenant = await tx.tenant.findUnique({ where: { id: TENANT_ID } });
    if (!tenant) throw new Error("Tenant not found. AI provider settings were not saved.");
    const theme = tenant.theme as Record<string, unknown>;
    const existing = (theme.aiSettings ?? {}) as Record<string, unknown>;
    const aiSettings = {
      ...existing,
      ...(primaryProvider ? { primaryProvider } : {}),
      ...(fallbackEnabled === undefined ? {} : { fallbackEnabled }),
    };

    await tx.tenant.update({
      where: { id: TENANT_ID },
      data: {
        theme: { ...theme, aiSettings } as unknown as Prisma.InputJsonValue,
      },
    });
  });
}
