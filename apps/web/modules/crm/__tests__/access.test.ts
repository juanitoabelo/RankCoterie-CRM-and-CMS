import { describe, expect, it } from "vitest";
import {
  activityAccessWhere,
  clientAccessWhere,
  dealAccessWhere,
  leadAccessWhere,
  taskAccessWhere,
  type CrmAccess,
} from "../access";

const admin: CrmAccess = { userId: "admin-1", isAdmin: true, ownedOnly: false };
const rep: CrmAccess = { userId: "rep-1", isAdmin: false, ownedOnly: true };
const openRep: CrmAccess = { userId: "rep-2", isAdmin: false, ownedOnly: false };

describe("CRM access filters", () => {
  it("does not restrict admins or reps with owned-only disabled", () => {
    expect(dealAccessWhere(admin)).toEqual({});
    expect(leadAccessWhere(admin)).toEqual({});
    expect(clientAccessWhere(admin)).toEqual({});
    expect(activityAccessWhere(admin)).toEqual({});
    expect(taskAccessWhere(admin)).toEqual({});
    expect(dealAccessWhere(openRep)).toEqual({});
    expect(activityAccessWhere(openRep)).toEqual({});
  });

  it("scopes deals, leads, and clients to the rep", () => {
    expect(dealAccessWhere(rep)).toEqual({ ownerId: "rep-1" });
    expect(leadAccessWhere(rep)).toEqual({ assignedToId: "rep-1" });
    expect(clientAccessWhere(rep)).toEqual({ assignedToId: "rep-1" });
  });

  it("scopes activities through their linked records", () => {
    expect(activityAccessWhere(rep)).toEqual({
      OR: [
        { deal: { ownerId: "rep-1" } },
        { lead: { assignedToId: "rep-1" } },
        { client: { assignedToId: "rep-1" } },
      ],
    });
  });

  it("scopes tasks to the assignee or a linked record the rep owns", () => {
    expect(taskAccessWhere(rep)).toEqual({
      OR: [
        { assigneeId: "rep-1" },
        { deal: { ownerId: "rep-1" } },
        { lead: { assignedToId: "rep-1" } },
        { client: { assignedToId: "rep-1" } },
      ],
    });
  });
});
