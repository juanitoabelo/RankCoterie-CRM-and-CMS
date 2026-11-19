type DateLike = Date | string | number | null | undefined;

type RecordLike = Record<string, unknown>;

type CrmSequenceStepLike = {
  id: string;
  tenantId?: string;
  sequenceId: string;
  position: number;
  subject: string;
  body: string;
  delayMinutes: number;
  createdAt: DateLike;
  updatedAt: DateLike;
};

type CrmEnrollmentLike = {
  id: string;
  tenantId?: string;
  sequenceId: string;
  leadId: string | null;
  clientId: string | null;
  dealId: string | null;
  connectionId: string | null;
  toEmail: string;
  status: string;
  currentStep: number;
  nextSendAt: DateLike;
  createdAt: DateLike;
  updatedAt: DateLike;
};

type CrmSequenceLike = {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body: string;
  status: string;
  createdById: string | null;
  createdAt: DateLike;
  updatedAt: DateLike;
  steps?: readonly CrmSequenceStepLike[];
  enrollments?: readonly CrmEnrollmentLike[];
  _count?: { steps?: number; enrollments?: number };
};

type CrmEmailMessageLike = {
  id: string;
  enrollmentId: string | null;
  connectionId: string | null;
  dealId: string | null;
  leadId: string | null;
  clientId: string | null;
  toEmail: string;
  subject: string;
  body: string;
  bodyHtml: string | null;
  providerMessageId: string | null;
  status: string;
  error: string | null;
  failureCode: string | null;
  failedAt: DateLike;
  deliveredAt: DateLike;
  openCount: number;
  firstOpenedAt: DateLike;
  lastOpenedAt: DateLike;
  clickCount: number;
  firstClickedAt: DateLike;
  lastClickedAt: DateLike;
  bouncedAt: DateLike;
  bounceType: string | null;
  bounceReason: string | null;
  unsubscribedAt: DateLike;
  createdAt: DateLike;
  sentAt: DateLike;
};

type CrmWorkflowLike = {
  id: string;
  name: string;
  description: string | null;
  event: string;
  conditions: unknown;
  actions: unknown;
  enabled: boolean;
  createdById: string | null;
  createdAt: DateLike;
  updatedAt: DateLike;
};

type CrmWorkflowRunLike = {
  id: string;
  workflowId: string;
  event: string;
  payload: unknown;
  matched: boolean;
  actions: unknown;
  status: string;
  error: string | null;
  createdAt: DateLike;
};

type WebhookEndpointLike = {
  id: string;
  name: string;
  url: string;
  events: readonly string[];
  isActive: boolean;
  maxRetries: number;
  retryDelay: number;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: DateLike;
  createdAt: DateLike;
  updatedAt: DateLike;
  _count?: { deliveries?: number };
};

type WebhookDeliveryLike = {
  id: string;
  endpointId: string;
  listingId: string | null;
  event: string;
  payload: unknown;
  responseStatus: number | null;
  responseBody: string | null;
  attempt: number;
  status: string;
  nextRetryAt: DateLike;
  deliveredAt: DateLike;
  createdAt: DateLike;
  updatedAt: DateLike;
  endpoint?: WebhookEndpointLike | null;
};

function iso(value: DateLike): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as RecordLike).toNumber === "function"
  );
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (isDecimalLike(value)) {
    const converted = value.toNumber();
    return Number.isFinite(converted) ? converted : null;
  }
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : null;
}

function normalizeJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return iso(value);
  if (isDecimalLike(value)) return toNumber(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeJson);
  return Object.fromEntries(
    Object.entries(value as RecordLike).map(([key, entry]) => [key, normalizeJson(entry)]),
  );
}

export function serializeCrmSequenceStep(step: CrmSequenceStepLike) {
  return {
    id: step.id,
    sequenceId: step.sequenceId,
    position: step.position,
    subject: step.subject,
    body: step.body,
    delayMinutes: step.delayMinutes,
    createdAt: iso(step.createdAt),
    updatedAt: iso(step.updatedAt),
  };
}

export function serializeCrmEnrollment(enrollment: CrmEnrollmentLike) {
  return {
    id: enrollment.id,
    sequenceId: enrollment.sequenceId,
    leadId: enrollment.leadId,
    clientId: enrollment.clientId,
    dealId: enrollment.dealId,
    connectionId: enrollment.connectionId,
    toEmail: enrollment.toEmail,
    status: enrollment.status,
    currentStep: enrollment.currentStep,
    nextSendAt: iso(enrollment.nextSendAt),
    createdAt: iso(enrollment.createdAt),
    updatedAt: iso(enrollment.updatedAt),
  };
}

export function serializeCrmSequence(sequence: CrmSequenceLike) {
  return {
    id: sequence.id,
    name: sequence.name,
    description: sequence.description,
    subject: sequence.subject,
    body: sequence.body,
    status: sequence.status,
    createdById: sequence.createdById,
    createdAt: iso(sequence.createdAt),
    updatedAt: iso(sequence.updatedAt),
    ...(sequence._count
      ? {
          stepsCount: sequence._count.steps ?? 0,
          enrollmentsCount: sequence._count.enrollments ?? 0,
        }
      : {}),
    ...(sequence.steps ? { steps: sequence.steps.map(serializeCrmSequenceStep) } : {}),
    ...(sequence.enrollments
      ? { enrollments: sequence.enrollments.map(serializeCrmEnrollment) }
      : {}),
  };
}

export function serializeCrmEmailMessage(message: CrmEmailMessageLike) {
  return {
    id: message.id,
    enrollmentId: message.enrollmentId,
    connectionId: message.connectionId,
    dealId: message.dealId,
    leadId: message.leadId,
    clientId: message.clientId,
    toEmail: message.toEmail,
    subject: message.subject,
    body: message.body,
    bodyHtml: message.bodyHtml,
    providerMessageId: message.providerMessageId,
    status: message.status,
    error: message.error,
    failureCode: message.failureCode,
    failedAt: iso(message.failedAt),
    deliveredAt: iso(message.deliveredAt),
    openCount: message.openCount,
    firstOpenedAt: iso(message.firstOpenedAt),
    lastOpenedAt: iso(message.lastOpenedAt),
    clickCount: message.clickCount,
    firstClickedAt: iso(message.firstClickedAt),
    lastClickedAt: iso(message.lastClickedAt),
    bouncedAt: iso(message.bouncedAt),
    bounceType: message.bounceType,
    bounceReason: message.bounceReason,
    unsubscribedAt: iso(message.unsubscribedAt),
    createdAt: iso(message.createdAt),
    sentAt: iso(message.sentAt),
  };
}

export function serializeCrmWorkflow(workflow: CrmWorkflowLike) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    event: workflow.event,
    conditions: normalizeJson(workflow.conditions),
    actions: normalizeJson(workflow.actions),
    enabled: workflow.enabled,
    createdById: workflow.createdById,
    createdAt: iso(workflow.createdAt),
    updatedAt: iso(workflow.updatedAt),
  };
}

export function serializeCrmWorkflowRun(run: CrmWorkflowRunLike) {
  return {
    id: run.id,
    workflowId: run.workflowId,
    event: run.event,
    payload: normalizeJson(run.payload),
    matched: run.matched,
    actions: normalizeJson(run.actions),
    status: run.status,
    error: run.error,
    createdAt: iso(run.createdAt),
  };
}

export function serializeWebhookEndpoint(endpoint: WebhookEndpointLike) {
  return {
    id: endpoint.id,
    name: endpoint.name,
    url: endpoint.url,
    events: [...endpoint.events],
    isActive: endpoint.isActive,
    maxRetries: endpoint.maxRetries,
    retryDelay: endpoint.retryDelay,
    successCount: endpoint.successCount,
    failureCount: endpoint.failureCount,
    lastTriggeredAt: iso(endpoint.lastTriggeredAt),
    createdAt: iso(endpoint.createdAt),
    updatedAt: iso(endpoint.updatedAt),
    ...(endpoint._count ? { deliveriesCount: endpoint._count.deliveries ?? 0 } : {}),
  };
}

export function serializeWebhookDelivery(delivery: WebhookDeliveryLike) {
  return {
    id: delivery.id,
    endpointId: delivery.endpointId,
    listingId: delivery.listingId,
    event: delivery.event,
    payload: normalizeJson(delivery.payload),
    responseStatus: toNumber(delivery.responseStatus),
    responseBody: delivery.responseBody,
    attempt: delivery.attempt,
    status: delivery.status,
    nextRetryAt: iso(delivery.nextRetryAt),
    deliveredAt: iso(delivery.deliveredAt),
    createdAt: iso(delivery.createdAt),
    updatedAt: iso(delivery.updatedAt),
    ...(delivery.endpoint ? { endpoint: serializeWebhookEndpoint(delivery.endpoint) } : {}),
  };
}
