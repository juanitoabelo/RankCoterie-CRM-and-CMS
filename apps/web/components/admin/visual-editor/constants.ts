"use client";

import { CANVAS_ROOT_ID } from "@/lib/page-builder/types";

/** DOM attributes injected into the live renderers so the visual canvas can find elements. */
export const PB_EL_ATTR = "data-pb-el";
export const PB_KIND_ATTR = "data-pb-kind";
export const PB_TYPE_ATTR = "data-pb-type";

/** Sentinel id for the header/footer/page-layout container element. */
export const PB_CONTAINER = "__container__";

/** Sentinel id for the visual canvas itself (always droppable). */
export const PB_CANVAS_ROOT = CANVAS_ROOT_ID;