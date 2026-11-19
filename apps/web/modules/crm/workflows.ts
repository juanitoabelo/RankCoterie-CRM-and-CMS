export const CRM_WORKFLOW_EVENTS = [
  "lead.created",
  "deal.created",
  "deal.stage_changed",
  "activity.created",
] as const;

export type CrmWorkflowEvent = (typeof CRM_WORKFLOW_EVENTS)[number];

export type CrmWorkflowCondition = {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "gte" | "lte" | "gt" | "lt" | "is_empty" | "not_empty";
  value?: string | number;
};

export type CrmWorkflowAction = {
  type: "create_task" | "log_note" | "notify";
  text: string;
  assigneeId?: string;
};

export type CrmWorkflowRule = {
  id: string;
  name: string;
  description?: string;
  event: string;
  enabled: boolean;
  conditions: CrmWorkflowCondition[];
  actions: CrmWorkflowAction[];
};

export type CrmWorkflowPayload = Record<string, unknown> & { event: string };

const OPERATORS = new Set<CrmWorkflowCondition["operator"]>([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "gte",
  "lte",
  "gt",
  "lt",
  "is_empty",
  "not_empty",
]);

function resolveField(payload: CrmWorkflowPayload, field: string): unknown {
  return field.split(".").reduce<unknown>((value, part) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[part];
  }, payload);
}

function conditionMatches(payload: CrmWorkflowPayload, condition: CrmWorkflowCondition): boolean {
  const actual = resolveField(payload, condition.field);
  const expected = condition.value;
  const actualText = actual === null || actual === undefined ? "" : String(actual);
  const expectedText = expected === null || expected === undefined ? "" : String(expected);

  switch (condition.operator) {
    case "equals":
      return actualText.toLowerCase() === expectedText.toLowerCase();
    case "not_equals":
      return actualText.toLowerCase() !== expectedText.toLowerCase();
    case "contains":
      return actualText.toLowerCase().includes(expectedText.toLowerCase());
    case "not_contains":
      return !actualText.toLowerCase().includes(expectedText.toLowerCase());
    case "gte":
      return Number(actual) >= Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "is_empty":
      return actualText.trim().length === 0;
    case "not_empty":
      return actualText.trim().length > 0;
    default:
      return false;
  }
}

export function workflowMatches(rule: CrmWorkflowRule, payload: CrmWorkflowPayload): boolean {
  if (!rule.enabled || rule.event !== payload.event) return false;
  return rule.conditions.every((condition) => conditionMatches(payload, condition));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function normalizeWorkflowRules(input: unknown): CrmWorkflowRule[] {
  let parsed: unknown = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  const rules: CrmWorkflowRule[] = [];
  for (const value of parsed) {
    const row = asRecord(value);
    if (!row || typeof row.id !== "string" || typeof row.event !== "string") continue;
    if (row.enabled === false) continue;

    const conditions = Array.isArray(row.conditions)
      ? row.conditions
          .map(asRecord)
          .filter((condition): condition is Record<string, unknown> => condition !== null)
          .filter((condition) => typeof condition.field === "string")
          .filter((condition) => OPERATORS.has(condition.operator as CrmWorkflowCondition["operator"]))
          .map((condition) => ({
            field: condition.field as string,
            operator: condition.operator as CrmWorkflowCondition["operator"],
            value: condition.value as string | number | undefined,
          }))
      : [];

    const actions = Array.isArray(row.actions)
      ? row.actions
          .map(asRecord)
          .filter((action): action is Record<string, unknown> => action !== null)
          .filter((action) => ["create_task", "log_note", "notify"].includes(String(action.type)))
          .filter((action) => typeof action.text === "string" && action.text.trim().length > 0)
          .map((action) => ({
            type: action.type as CrmWorkflowAction["type"],
            text: action.text as string,
            assigneeId: typeof action.assigneeId === "string" ? action.assigneeId : undefined,
          }))
      : [];

    rules.push({
      id: row.id,
      name: typeof row.name === "string" ? row.name : row.id,
      description: typeof row.description === "string" ? row.description : undefined,
      event: row.event,
      enabled: true,
      conditions,
      actions,
    });
  }
  return rules;
}
