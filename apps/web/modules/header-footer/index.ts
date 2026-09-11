/**
 * Header / Footer Builder — Module Public API
 */
export type { HeaderFooterData, HeaderFooterRow, HeaderFooterRevisionRow, AssignmentRow } from "./queries";
export {
  parseHeaderFooterData,
  serializeHeaderFooterData,
  listHeaderFooters,
  getHeaderFooter,
  createHeaderFooter,
  updateHeaderFooterData,
  updateHeaderFooterMeta,
  setDefaultHeaderFooter,
  deleteHeaderFooter,
  snapshotHeaderFooterRevision,
  listHeaderFooterRevisions,
  restoreHeaderFooterRevision,
  resolveHeaderFooter,
  getAssignments,
  saveAssignments,
} from "./queries";
