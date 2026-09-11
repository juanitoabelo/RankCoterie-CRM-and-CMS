/**
 * Header / Footer Builder — Module Public API
 */
export type { HeaderFooterRow, HeaderFooterRevisionRow, AssignmentRow } from "./queries";
export {
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
