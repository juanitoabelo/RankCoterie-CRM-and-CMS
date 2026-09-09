/**
 * Dashboard Module — Public API
 * 
 * Provides dashboard and reporting functionality including stats,
 * widgets, and report generation.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getDashboardStats, getWidgetsForSlot } from "@/modules/dashboard";
 * 
 * const stats = await getDashboardStats();
 * const widgets = await getWidgetsForSlot("HOME_TOP");
 * ```
 * 
 * @example
 * ```tsx
 * // Get report data
 * import { getReportData } from "@/modules/dashboard";
 * 
 * const report = await getReportData({
 *   dateRange: { start: "2024-01-01", end: "2024-12-31" },
 *   metrics: ["pageViews", "listings"]
 * });
 * ```
 */

// Types
/** Widget slot positions */
export type { WidgetSlot } from "./types";
/** Widget with relations */
export type { WidgetWithRelations } from "./types";
/** Widget placement configuration */
export type { WidgetPlacement } from "./types";
/** Dashboard statistics */
export type { DashboardStats } from "./types";
/** Report data structure */
export type { ReportData } from "./types";
/** Report filter options */
export type { ReportFilter } from "./types";

// Queries
/** Get dashboard statistics */
export { getDashboardStats } from "./queries";
/** Get widgets for a specific slot */
export { getWidgetsForSlot } from "./queries";
/** Get all widgets */
export { getAllWidgets } from "./queries";
/** Get a single widget by ID */
export { getWidgetById } from "./queries";
/** Get report data with filters */
export { getReportData } from "./queries";
