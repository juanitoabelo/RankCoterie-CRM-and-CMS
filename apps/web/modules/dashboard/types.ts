/**
 * Dashboard Module — Types
 * 
 * Defines types for dashboard and reporting (widgets, reports).
 */

/** Widget placement slot */
export type WidgetSlot = "HOME" | "SIDEBAR" | "FOOTER" | "CATEGORY" | "REGION";

/** Widget with relations */
export interface WidgetWithRelations {
  id: string;
  name: string;
  html: string;
  active: boolean;
  imageAssetId: string | null;
  redirectUrl: string | null;
  createdAt: Date;
  placements?: WidgetPlacement[];
}

/** Widget placement */
export interface WidgetPlacement {
  id: string;
  slot: WidgetSlot;
  active: boolean;
}

/** Dashboard summary stats */
export interface DashboardStats {
  pendingListings: number;
  liveListings: number;
  activeExclusions: number;
  contentTemplates: number;
}

/** Report data */
export interface ReportData {
  approvedRevenue: number;
  clientCount: number;
  liveListings: number;
  openTodos: number;
  leadCounts: Array<{ status: string; count: number }>;
  invoiceCounts: Array<{ status: string; count: number; total: number }>;
}

/** Report query filters */
export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
}
