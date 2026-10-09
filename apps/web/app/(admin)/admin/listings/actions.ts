/**
 * @deprecated Import from "@/modules/listings" instead.
 * This file is maintained for backward compatibility.
 */
export type {
  ActionResult,
  ListingFormInput,
  DuplicateListing,
  DuplicateCheckResult,
  PreviewListingResult,
} from "@/modules/listings/actions";
export {
  createListing,
  updateListing,
  approveListing,
  rejectListing,
  approveListingForm,
  rejectListingForm,
  checkDuplicateListing,
  previewListing,
  updateMyListing,
  completeClaim,
} from "@/modules/listings/actions";
