import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  serializeCrmEmailMessage,
  serializeCrmEnrollment,
  serializeCrmSequence,
  serializeCrmSequenceStep,
  serializeCrmWorkflow,
  serializeCrmWorkflowRun,
  serializeWebhookDelivery,
  serializeWebhookEndpoint,
} from "../serializers";

const createdAt = new Date("2026-01-02T03:04:05.000Z");
const updatedAt = new Date("2026-02-03T04:05:06.000Z");

function expectIso(value: unknown): void {
  expect(typeof value).toBe("string");
  expect(Number.isNaN(Date.parse(String(value)))).toBe(false);
  expect(value).toBe(new Date(String(value)).toISOString());
}

describe("CRM serializers", () => {
  it("serializes a sequence with ISO dates and nested steps/enrollments", () => {
    const sequence = {
      id: "seq_1",
      tenantId: "tenant_1",
      name: "Welcome",
      description: null,
      subject: "Hello",
      body: "Body",
      status: "ACTIVE",
      createdById: null,
      createdAt,
      updatedAt,
      steps: [
        {
          id: "step_1",
          tenantId: "tenant_1",
          sequenceId: "seq_1",
          position: 0,
          subject: "Step",
          body: "Step body",
          delayMinutes: 60,
          createdAt,
          updatedAt,
        },
      ],
      enrollments: [
        {
          id: "enroll_1",
          tenantId: "tenant_1",
          sequenceId: "seq_1",
          leadId: "lead_1",
          clientId: null,
          dealId: null,
          connectionId: "conn_1",
          toEmail: "person@example.com",
          status: "ACTIVE",
          currentStep: 0,
          nextSendAt: updatedAt,
          createdAt,
          updatedAt,
        },
      ],
    };

    const result = serializeCrmSequence(sequence);

    expect(result.createdAt).toBe(createdAt.toISOString());
    expect(result.updatedAt).toBe(updatedAt.toISOString());
    expect(result.steps?.[0].createdAt).toBe(createdAt.toISOString());
    expect(result.enrollments?.[0].nextSendAt).toBe(updatedAt.toISOString());
  });

  it("converts Decimal values in email message metadata to numbers", () => {
    const message = {
      id: "msg_1",
      tenantId: "tenant_1",
      enrollmentId: null,
      connectionId: null,
      dealId: "deal_1",
      leadId: null,
      clientId: null,
      toEmail: "person@example.com",
      subject: "Invoice",
      body: "Text",
      bodyHtml: "<p>Text</p>",
      trackingToken: "tracking-token-should-not-be-public",
      trackingEnabled: true,
      providerMessageId: "provider_1",
      status: "SENT",
      error: null,
      failureCode: null,
      failedAt: null,
      deliveredAt: createdAt,
      openCount: 1,
      firstOpenedAt: createdAt,
      lastOpenedAt: null,
      clickCount: 0,
      firstClickedAt: null,
      lastClickedAt: null,
      bouncedAt: null,
      bounceType: null,
      bounceReason: null,
      unsubscribedAt: null,
      createdAt,
      sentAt: createdAt,
      events: [],
    };

    const result = serializeCrmEmailMessage(message);

    expect(result.sentAt).toBe(createdAt.toISOString());
    expect(result.deliveredAt).toBe(createdAt.toISOString());
    expect("trackingToken" in result).toBe(false);
  });

  it("serializes workflow rules and runs, including JSON payload dates", () => {
    const workflow = {
      id: "wf_1",
      tenantId: "tenant_1",
      name: "Notify on win",
      description: null,
      event: "deal.stage_changed",
      conditions: [{ field: "stageId", operator: "equals", value: "won" }],
      actions: [{ type: "notify", text: "Nice" }],
      enabled: true,
      createdById: null,
      createdAt,
      updatedAt,
    };
    const run = {
      id: "run_1",
      tenantId: "tenant_1",
      workflowId: "wf_1",
      event: "deal.stage_changed",
      payload: { happenedAt: createdAt, amount: new Prisma.Decimal("12.50") },
      matched: true,
      actions: [{ type: "notify", text: "Nice" }],
      status: "COMPLETED",
      error: null,
      createdAt,
    };

    const serializedWorkflow = serializeCrmWorkflow(workflow);
    const serializedRun = serializeCrmWorkflowRun(run);

    expect(serializedWorkflow.createdAt).toBe(createdAt.toISOString());
    expect(serializedWorkflow.conditions).toEqual(workflow.conditions);
    expect(serializedRun.createdAt).toBe(createdAt.toISOString());
    expectIso((serializedRun.payload as Record<string, unknown>).happenedAt);
    expect((serializedRun.payload as Record<string, unknown>).amount).toBe(12.5);
  });

  it("serializes steps and enrollments independently", () => {
    const step = serializeCrmSequenceStep({
      id: "step_1",
      tenantId: "tenant_1",
      sequenceId: "seq_1",
      position: 2,
      subject: "Follow up",
      body: "Body",
      delayMinutes: 1440,
      createdAt,
      updatedAt,
    });
    const enrollment = serializeCrmEnrollment({
      id: "enroll_1",
      tenantId: "tenant_1",
      sequenceId: "seq_1",
      leadId: null,
      clientId: null,
      dealId: null,
      connectionId: "conn_1",
      toEmail: "person@example.com",
      status: "COMPLETED",
      currentStep: 3,
      nextSendAt: updatedAt,
      createdAt,
      updatedAt,
    });

    expect(step.updatedAt).toBe(updatedAt.toISOString());
    expectIso(enrollment.nextSendAt);
  });
});

describe("webhook serializers", () => {
  it("never exposes endpoint secrets, even nested in a delivery", () => {
    const endpoint = {
      id: "ep_1",
      tenantId: "tenant_1",
      name: "CRM",
      url: "https://example.com/hook",
      secret: "signing-secret",
      secretKey: "hmac-secret",
      events: ["lead.created"],
      isActive: true,
      maxRetries: 3,
      retryDelay: 60,
      successCount: 2,
      failureCount: 1,
      lastTriggeredAt: createdAt,
      createdAt,
      updatedAt,
    };
    const delivery = {
      id: "del_1",
      tenantId: "tenant_1",
      endpointId: "ep_1",
      listingId: null,
      event: "lead.created",
      payload: { amount: new Prisma.Decimal("9.99"), at: createdAt },
      responseStatus: 200,
      responseBody: "ok",
      attempt: 1,
      status: "SUCCESS",
      nextRetryAt: null,
      deliveredAt: createdAt,
      createdAt,
      updatedAt,
      endpoint,
    };

    const serializedEndpoint = serializeWebhookEndpoint(endpoint);
    const serializedDelivery = serializeWebhookDelivery(delivery);

    expect(JSON.stringify(serializedEndpoint)).not.toContain("secret");
    expect(serializedEndpoint.lastTriggeredAt).toBe(createdAt.toISOString());
    expect(JSON.stringify(serializedDelivery)).not.toContain("secret");
    expect(JSON.stringify(serializedDelivery)).not.toContain("hmac-secret");
    expect(serializedDelivery.deliveredAt).toBe(createdAt.toISOString());
    expect(serializedDelivery.endpoint?.name).toBe("CRM");
    expect((serializedDelivery.payload as Record<string, unknown>).amount).toBe(9.99);
    expectIso((serializedDelivery.payload as Record<string, unknown>).at);
  });
});
