"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Block, BlockType } from "@/lib/page-builder/types";
import {
  createBlock,
  createLayoutBlock,
  createSingleColumnRow,
  isRowBlock,
  isSectionBlock,
} from "@/lib/page-builder/types";
import { innermostPointerWithin } from "@/lib/page-builder/collision";
import {
  addBlockFromPalette,
  addRowToSection,
  columnById,
  duplicateBlock,
  duplicateColumn,
  findBlock,
  findColumnForBlock,
  insertLayoutBlock,
  mapBlocks,
  moveBlock,
  normalizeDropTarget,
  removeBlock,
  removeColumnFromRow,
  rowIdForColumn,
  updateColumnProps,
} from "@/lib/page-builder/tree";
import type {
  ContainerSettings,
  ProductTemplateProductData,
  ProductTemplateTab,
} from "@/lib/product-template/types";
import {
  productBindingFields,
  productBindingTargets,
} from "@/lib/product-template/bindings";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/product-template/types";
import {
  parseProductTemplateData,
  serializeProductTemplateData,
} from "@/lib/product-template/serialization";
import ProductTemplateRenderer from "@/components/storefront/ProductTemplateRenderer";
import BlockEditor from "@/components/admin/page-builder/BlockEditor";
import BlogTemplateCanvas from "@/components/admin/blog-template-builder/BlogTemplateCanvas";
import ContainerSettingsEditor from "@/components/admin/blog-template-builder/ContainerSettingsEditor";
import ColumnEditor from "@/components/admin/header-footer-builder/ColumnEditor";
import ProductTemplatePalette from "./ProductTemplatePalette";

type SaveResult = { ok: true } | { ok: false; error: string };
type ProductPreview = ProductTemplateProductData;

const PRODUCT_BLOCKS = [
  { type: "productTitle", label: "Product Title" },
  { type: "productPrice", label: "Product Price" },
  { type: "productGallery", label: "Product Image Gallery" },
  { type: "productShortDescription", label: "Short Description" },
  { type: "productDescription", label: "Full Description" },
  { type: "productSku", label: "SKU" },
  { type: "productStock", label: "Stock Status" },
  { type: "productSpecifications", label: "Specifications & Attributes" },
  { type: "productPurchase", label: "Add to Cart / Purchase" },
  { type: "productTabs", label: "Product Information Tabs" },
  { type: "productGrid", label: "Related Products Grid" },
  { type: "productSlider", label: "Product Slider" },
  { type: "productCategories", label: "Product Categories" },
  { type: "productSpotlight", label: "Product Spotlight" },
  { type: "reviews", label: "Product Reviews" },
  { type: "comparisonTable", label: "Product Comparison Table" },
] as const;

const STANDARD_BLOCKS = [
  { type: "hero", label: "Hero" },
  { type: "text", label: "Text" },
  { type: "heading", label: "Heading" },
  { type: "image", label: "Image" },
  { type: "cta", label: "Call to Action" },
  { type: "features", label: "Features" },
  { type: "button", label: "Button" },
  { type: "faq", label: "FAQ" },
  { type: "spacer", label: "Spacer" },
  { type: "divider", label: "Divider" },
  { type: "section", label: "Section" },
  { type: "row", label: "Row / Columns" },
] as const;

const CUSTOM_PRODUCT_BLOCK_TYPES = new Set([
  "productTitle",
  "productPrice",
  "productGallery",
  "productShortDescription",
  "productDescription",
  "productSku",
  "productStock",
  "productSpecifications",
  "productPurchase",
  "productTabs",
]);

function createProductBlock(type: string): Block {
  const id = crypto.randomUUID();
  switch (type) {
    case "productTitle":
      return { id, type, props: { level: 1 } };
    case "productPrice":
      return { id, type, props: {} };
    case "productGallery":
      return { id, type, props: {} };
    case "productShortDescription":
      return { id, type, props: {} };
    case "productDescription":
      return { id, type, props: {} };
    case "productSku":
      return { id, type, props: {} };
    case "productStock":
      return { id, type, props: {} };
    case "productSpecifications":
      return { id, type, props: {} };
    case "productPurchase":
      return { id, type, props: {} };
    case "productTabs":
      return {
        id,
        type,
        props: {
          tabs: [{ id: crypto.randomUUID(), label: "Description", binding: "description", content: "" }],
        },
      };
    default:
      throw new Error(`Unknown product template block: ${type}`);
  }
}

function blockLabel(type: string) {
  return (
    PRODUCT_BLOCKS.find((block) => block.type === type)?.label ??
    STANDARD_BLOCKS.find((block) => block.type === type)?.label ??
    type
  );
}

interface Props {
  templateId: string;
  templateName: string;
  initialBlocks: Block[];
  initialContainerSettings?: ContainerSettings;
  isDefault: boolean;
  initialAssignments: Array<{
    id: string;
    pageId: string | null;
    pageType: string | null;
    priority: number;
  }>;
  previewProducts: ProductPreview[];
  previewGateways: Array<{ id: string; name: string; type: string }>;
  availableProducts: Array<{ id: string; name: string; slug: string }>;
  onSave: (
    id: string,
    data: string,
    opts?: { createRevision?: boolean },
  ) => Promise<SaveResult>;
  onListRevisions: (id: string) => Promise<Array<{ id: string; createdAt: Date | string }>>;
  onRestoreRevision: (
    id: string,
    revisionId: string,
  ) => Promise<SaveResult & { data?: string }>;
  onSaveAssignments: (id: string, formData: FormData) => Promise<SaveResult>;
}

export default function ProductTemplateBuilder({
  templateId,
  templateName,
  initialBlocks,
  initialContainerSettings,
  isDefault,
  initialAssignments,
  previewProducts,
  previewGateways,
  availableProducts,
  onSave,
  onListRevisions,
  onRestoreRevision,
  onSaveAssignments,
}: Props) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [containerSettings, setContainerSettings] = useState<ContainerSettings>(
    initialContainerSettings ?? DEFAULT_CONTAINER_SETTINGS,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedPreviewId, setSelectedPreviewId] = useState(previewProducts[0]?.id ?? "");
  const [displayMode, setDisplayMode] = useState<"visual" | "structure">("visual");
  const [activeDrag, setActiveDrag] = useState<{ source: string; label: string } | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("saved");
  const [message, setMessage] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<Array<{ id: string; createdAt: Date | string }>>([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [assignedProductIds, setAssignedProductIds] = useState(
    initialAssignments.flatMap((assignment) => assignment.pageId ? [assignment.pageId] : []),
  );
  const savedRef = useRef(serializeProductTemplateData(initialBlocks, containerSettings));
  const blocksRef = useRef(blocks);
  const settingsRef = useRef(containerSettings);
  const selectedBlock = selectedId
    ? findBlock(blocks, selectedId)
    : null;
  const selectedColumn = selectedColumnId ? columnById(blocks, selectedColumnId) : null;
  const selectedColumnRow = selectedColumnId
    ? findBlock(blocks, rowIdForColumn(blocks, selectedColumnId) ?? "")
    : null;
  const previewProduct = previewProducts.find((product) => product.id === selectedPreviewId) ?? previewProducts[0];

  const updateBlocks = useCallback((next: Block[] | ((current: Block[]) => Block[])) => {
    setBlocks((current) => typeof next === "function" ? next(current) : next);
    setSaveState("idle");
  }, []);

  const persist = useCallback(async (createRevision = false) => {
    const data = serializeProductTemplateData(blocksRef.current, settingsRef.current);
    if (!createRevision && data === savedRef.current) return;
    setSaveState("saving");
    const result = await onSave(templateId, data, { createRevision });
    if (result.ok) {
      savedRef.current = data;
      setSaveState("saved");
      setMessage(createRevision ? "Version saved." : null);
      return;
    }
    setSaveState("error");
    setMessage(result.error);
  }, [onSave, templateId]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    settingsRef.current = containerSettings;
  }, [containerSettings]);

  useEffect(() => {
    const timer = window.setTimeout(() => void persist(), 1200);
    return () => window.clearTimeout(timer);
  }, [blocks, containerSettings, persist]);

  const addBlock = (type: string) => {
    const block = CUSTOM_PRODUCT_BLOCK_TYPES.has(type)
      ? createProductBlock(type)
      : createBlock(type as BlockType);
    updateBlocks((current) => addBlockFromPalette(current, block, selectedColumnId ?? undefined));
    setSelectedId(block.id);
    setSelectedColumnId(null);
  };

  const addLayout = (layoutId: string) => {
    const layout = createLayoutBlock(layoutId);
    updateBlocks((current) =>
      addBlockFromPalette(current, layout, selectedColumnId ?? undefined),
    );
    setSelectedId(layout.id);
    setSelectedColumnId(null);
  };

  const updateBlock = (id: string, patch: Record<string, unknown>) => {
    updateBlocks((current) =>
      mapBlocks(current, (block) =>
        block.id === id
          ? { ...block, props: { ...block.props, ...patch } } as Block
          : block,
      ),
    );
  };

  const updateColumn = (columnId: string, patch: Record<string, unknown>) => {
    updateBlocks((current) =>
      updateColumnProps(current, columnId, patch as Partial<import("@/lib/page-builder/types").ColumnData>),
    );
  };

  const removeSelectedColumn = () => {
    if (!selectedColumnId || !selectedColumnRow || !isRowBlock(selectedColumnRow)) return;
    const rowId = rowIdForColumn(blocks, selectedColumnId);
    if (!rowId || selectedColumnRow.props.columns.length <= 1) return;
    updateBlocks((current) => removeColumnFromRow(current, rowId, selectedColumnId));
    setSelectedColumnId(null);
  };

  const duplicateSelectedColumn = () => {
    if (!selectedColumnId || !selectedColumnRow || !isRowBlock(selectedColumnRow)) return;
    const rowId = rowIdForColumn(blocks, selectedColumnId);
    if (!rowId || selectedColumnRow.props.columns.length >= 6) return;
    const newId = crypto.randomUUID();
    updateBlocks((current) => duplicateColumn(current, rowId, selectedColumnId, 6, newId));
    setSelectedColumnId(newId);
  };

  const addTab = () => {
    if (!selectedBlock || selectedBlock.type !== "productTabs") return;
    const tabs = Array.isArray(selectedBlock.props.tabs)
      ? selectedBlock.props.tabs as ProductTemplateTab[]
      : [];
    updateBlock(selectedBlock.id, {
      tabs: [...tabs, { id: crypto.randomUUID(), label: `Tab ${tabs.length + 1}`, content: "" }],
    });
  };

  const productFields = productBindingFields(previewProduct);
  const selectedBindings = (
    (selectedBlock?.props as Record<string, unknown> | undefined)?.bindings ?? {}
  ) as Record<string, string>;
  const addRowToSelectedSection = () => {
    if (!selectedBlock || !isSectionBlock(selectedBlock)) return;
    updateBlocks((current) =>
      addRowToSection(current, selectedBlock.id, createSingleColumnRow()),
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("palette:")) {
      setActiveDrag({ source: "palette", label: blockLabel(id.slice("palette:".length)) });
    } else if (id.startsWith("layout:")) {
      setActiveDrag({ source: "layout", label: "Layout" });
    } else {
      const block = findBlock(blocksRef.current, id);
      setActiveDrag({ source: "canvas", label: block ? blockLabel(block.type) : "Block" });
      setSelectedId(id);
      setSelectedColumnId(findColumnForBlock(blocksRef.current, id)?.columnId ?? null);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = normalizeDropTarget(String(over.id));
    if (activeId.startsWith("palette:")) {
      const type = activeId.slice("palette:".length);
      const block = CUSTOM_PRODUCT_BLOCK_TYPES.has(type)
        ? createProductBlock(type)
        : createBlock(type as BlockType);
      updateBlocks((current) => addBlockFromPalette(current, block, overId));
      setSelectedId(block.id);
      setSelectedColumnId(null);
    } else if (activeId.startsWith("layout:")) {
      const layoutId = activeId.slice("layout:".length);
      updateBlocks((current) => insertLayoutBlock(current, layoutId, { overId }).blocks);
    } else {
      updateBlocks((current) => moveBlock(current, activeId, overId));
    }
  }, [updateBlocks]);

  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (activeDrag?.source === "palette" || activeDrag?.source === "layout") {
      return innermostPointerWithin(args);
    }
    return closestCenter(args);
  }, [activeDrag]);

  return (
    <div className="mt-4 space-y-4">
      <header className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <div className="min-w-[180px]">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Single Product Template</p>
          <h1 className="text-lg font-semibold text-zinc-900">{templateName}</h1>
        </div>
        <label className="text-xs text-zinc-600">
          Live preview
          <select
            value={selectedPreviewId}
            onChange={(event) => setSelectedPreviewId(event.target.value)}
            className="ml-2 rounded border border-zinc-300 bg-white px-2 py-1.5"
          >
            {previewProducts.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
            {previewProducts.length === 0 && <option value="">No products available</option>}
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Content width
          <select
            value={containerSettings.width ?? "boxed"}
            onChange={(event) => setContainerSettings((current) => ({
              ...current,
              width: event.target.value as "boxed" | "full",
            }))}
            className="ml-2 rounded border border-zinc-300 bg-white px-2 py-1.5"
          >
            <option value="boxed">Boxed</option>
            <option value="full">Full width</option>
          </select>
        </label>
        {containerSettings.width !== "full" && (
          <label className="text-xs text-zinc-600">
            Max width
            <input
              type="number"
              min={320}
              max={2400}
              value={containerSettings.maxWidth ?? 1200}
              onChange={(event) => setContainerSettings((current) => ({
                ...current,
                maxWidth: Number(event.target.value) || 1200,
              }))}
              className="ml-2 w-24 rounded border border-zinc-300 px-2 py-1.5"
            />
          </label>
        )}
        {isDefault && <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Default template</span>}
        <span className="ml-auto text-xs text-zinc-500" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : saveState === "error" ? "Save failed" : "Unsaved changes"}
        </span>
        <button
          type="button"
          onClick={() => void persist(true)}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700"
        >
          Save version
        </button>
        <button
          type="button"
          onClick={async () => {
            const result = await onListRevisions(templateId);
            setRevisions(result);
            setShowRevisions((current) => !current);
          }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Versions
        </button>
      </header>

      {message && (
        <p role={saveState === "error" ? "alert" : "status"} className={`text-sm ${saveState === "error" ? "text-red-700" : "text-green-700"}`}>
          {message}
        </p>
      )}
      {showRevisions && (
        <section className="rounded-lg border border-zinc-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold">Saved versions</h2>
          {revisions.length === 0 ? <p className="text-xs text-zinc-500">No saved versions yet.</p> : (
            <ul className="space-y-2">
              {revisions.map((revision) => (
                <li key={revision.id} className="flex items-center justify-between text-xs">
                  <span>{new Date(revision.createdAt).toLocaleString()}</span>
                  <button
                    type="button"
                    className="text-blue-700 hover:underline"
                    onClick={async () => {
                      const result = await onRestoreRevision(templateId, revision.id);
                      if (!result.ok || !result.data) {
                        setMessage(result.ok ? "The version could not be restored." : result.error);
                        return;
                      }
                      const restored = parseProductTemplateData(result.data);
                      updateBlocks(restored.blocks);
                      setContainerSettings(restored.containerSettings);
                      setMessage("Version restored.");
                    }}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <details className="rounded-lg border border-zinc-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
          Product assignments
          {assignedProductIds.length > 0 && (
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {assignedProductIds.length} assigned
            </span>
          )}
        </summary>
        <form
          className="mt-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setAssignmentMessage(null);
            const formData = new FormData(event.currentTarget);
            const selectedIds = formData.getAll("productId").map(String);
            const result = await onSaveAssignments(templateId, formData);
            setAssignmentMessage(result.ok ? "Product assignments saved." : result.error);
            if (result.ok) setAssignedProductIds(selectedIds);
          }}
        >
          <p className="mb-3 text-xs text-zinc-600">
            Choose products that should use this template instead of the default template.
          </p>
          <div className="grid max-h-56 gap-2 overflow-auto sm:grid-cols-2">
            {availableProducts.map((product) => (
              <label key={product.id} className="flex items-start gap-2 text-xs text-zinc-700">
                <input
                  type="checkbox"
                  name="productId"
                  value={product.id}
                  defaultChecked={initialAssignments.some(
                    (assignment) => assignment.pageId === product.id,
                  )}
                  className="mt-0.5"
                />
                <span>{product.name} <span className="text-zinc-400">/{product.slug}</span></span>
              </label>
            ))}
            {availableProducts.length === 0 && <p className="text-xs text-zinc-500">Create products before assigning a template.</p>}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">Save assignments</button>
            {assignmentMessage && <span role="status" className="text-xs text-zinc-600">{assignmentMessage}</span>}
          </div>
        </form>
      </details>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="min-w-0">
          <ProductTemplatePalette onAdd={addBlock} onAddLayout={addLayout} />
        </aside>

        <main className="min-h-[560px] min-w-0 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3">
            <div className="mr-auto">
              <h2 className="text-sm font-semibold text-zinc-800">Page builder</h2>
              <p className="text-xs text-zinc-500">
                Drag blocks into a row, container, or column. Use Structure to rearrange the layout.
              </p>
            </div>
            <div className="flex rounded-lg border border-zinc-200 p-0.5">
              {(["visual", "structure"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={displayMode === mode}
                  onClick={() => setDisplayMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                    displayMode === mode
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          {previewProduct ? (
            displayMode === "visual" ? (
              <ProductTemplateRenderer
                blocks={blocks}
                product={previewProduct}
                gateways={previewGateways}
                containerSettings={containerSettings}
                interactive={false}
              />
            ) : (
              <BlogTemplateCanvas
                blocks={blocks}
                viewport="desktop"
                containerSettings={containerSettings}
                selectedId={selectedId}
                selectedColumnId={selectedColumnId}
                onSelect={(id) => {
                  setSelectedId(id);
                  setSelectedColumnId(null);
                }}
                onSelectColumn={(id) => {
                  setSelectedColumnId(id);
                  setSelectedId(null);
                }}
                onRemove={(id) => {
                  updateBlocks((current) => removeBlock(current, id));
                  if (selectedId === id) setSelectedId(null);
                }}
                onDuplicate={(id) => updateBlocks((current) => duplicateBlock(current, id))}
                onAddRowToSection={(sectionId) =>
                  updateBlocks((current) =>
                    addRowToSection(current, sectionId, createSingleColumnRow()),
                  )
                }
                renderBlock={(block) => (
                  <ProductTemplateRenderer
                    blocks={[block]}
                    product={previewProduct}
                    gateways={previewGateways}
                    containerSettings={containerSettings}
                    interactive={false}
                  />
                )}
              />
            )
          ) : (
            <div className="rounded border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
              Choose a product preview to build this template.
            </div>
          )}
        </main>

        <aside className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {selectedBlock ? "Block settings" : selectedColumn ? "Column settings" : "Page settings"}
          </h2>
          {!selectedBlock && selectedColumn && selectedColumnId ? (
            <ColumnEditor
              column={selectedColumn}
              onUpdate={(patch) => updateColumn(selectedColumnId, patch)}
              onRemove={removeSelectedColumn}
              onDuplicate={duplicateSelectedColumn}
            />
          ) : !selectedBlock ? (
            <ContainerSettingsEditor
              settings={containerSettings}
              onChange={setContainerSettings}
            />
          ) : (
            <>
              <div className="rounded bg-zinc-50 px-2 py-2 text-sm font-medium">{blockLabel(selectedBlock.type)}</div>
              {isSectionBlock(selectedBlock) && (
                <button type="button" onClick={addRowToSelectedSection} className="w-full rounded border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                  + Add row to section
                </button>
              )}
              {selectedBlock.type === "productTabs" ? (
                <div className="space-y-3">
                  {(selectedBlock.props.tabs as ProductTemplateTab[] ?? []).map((tab, index, tabs) => (
                    <fieldset key={tab.id} className="space-y-2 rounded border border-zinc-200 p-2">
                      <legend className="px-1 text-xs font-medium">Tab {index + 1}</legend>
                      <label className="block text-xs text-zinc-600">
                        Label
                        <input
                          value={tab.label}
                          onChange={(event) => updateBlock(selectedBlock.id, {
                            tabs: tabs.map((item) => item.id === tab.id ? { ...item, label: event.target.value } : item),
                          })}
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
                        />
                      </label>
                      <label className="block text-xs text-zinc-600">
                        Product data
                        <select
                          value={tab.binding ?? ""}
                          onChange={(event) => updateBlock(selectedBlock.id, {
                            tabs: tabs.map((item) => item.id === tab.id ? { ...item, binding: event.target.value || undefined } : item),
                          })}
                          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5"
                        >
                          <option value="">Use custom tab content</option>
                          {productFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                        </select>
                      </label>
                      {!tab.binding && (
                        <label className="block text-xs text-zinc-600">
                          Tab content
                          <textarea
                            value={tab.content ?? ""}
                            onChange={(event) => updateBlock(selectedBlock.id, {
                              tabs: tabs.map((item) => item.id === tab.id ? { ...item, content: event.target.value } : item),
                            })}
                            rows={4}
                            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
                          />
                        </label>
                      )}
                      {tabs.length > 1 && (
                        <button type="button" onClick={() => updateBlock(selectedBlock.id, { tabs: tabs.filter((item) => item.id !== tab.id) })} className="text-xs text-red-600 hover:underline">
                          Remove tab
                        </button>
                      )}
                    </fieldset>
                  ))}
                  <button type="button" onClick={addTab} className="w-full rounded border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                    + Add product information tab
                  </button>
                </div>
              ) : selectedBlock.type.startsWith("product") ? (
                <div className="space-y-3">
                  {selectedBlock.type === "productTitle" && (
                    <label className="block text-xs text-zinc-600">
                      Heading level
                      <select value={String(selectedBlock.props.level ?? 1)} onChange={(event) => updateBlock(selectedBlock.id, { level: Number(event.target.value) })} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5">
                        {[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>H{level}</option>)}
                      </select>
                    </label>
                  )}
                  <p className="text-xs leading-relaxed text-zinc-500">This block automatically displays the matching product&apos;s data on its product page.</p>
                  <label className="block text-xs text-zinc-600">
                    Background color
                    <input
                      type="color"
                      value={String((selectedBlock.props as Record<string, unknown>).bgColor ?? "#ffffff")}
                      onChange={(event) => updateBlock(selectedBlock.id, { bgColor: event.target.value })}
                      className="mt-1 h-9 w-full rounded border border-zinc-300"
                    />
                  </label>
                  <label className="block text-xs text-zinc-600">
                    Text color
                    <input
                      type="color"
                      value={String((selectedBlock.props as Record<string, unknown>).textColor ?? "#18181b")}
                      onChange={(event) => updateBlock(selectedBlock.id, { textColor: event.target.value })}
                      className="mt-1 h-9 w-full rounded border border-zinc-300"
                    />
                  </label>
                  <label className="block text-xs text-zinc-600">
                    Padding (px)
                    <input
                      type="number"
                      min={0}
                      max={240}
                      value={String((selectedBlock.props as Record<string, unknown>).padding ?? 16)}
                      onChange={(event) => updateBlock(selectedBlock.id, { padding: Number(event.target.value) })}
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
                    />
                  </label>
                </div>
              ) : (
                <>
                  <BlockEditor
                    block={selectedBlock}
                    onChange={(props) => updateBlock(selectedBlock.id, props as Record<string, unknown>)}
                  />
                  {productBindingTargets(selectedBlock.type).length > 0 && (
                    <details className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3" open>
                      <summary className="cursor-pointer text-xs font-semibold text-indigo-900">Product data bindings</summary>
                      <p className="mt-2 text-[11px] text-zinc-600">Connect block text and images to the product shown on the page.</p>
                      <div className="mt-3 space-y-2">
                        {productBindingTargets(selectedBlock.type).map((target) => (
                          <label key={target.key} className="block text-[11px] font-medium text-zinc-700">
                            {target.label}
                            <select
                              value={selectedBindings[target.key] ?? ""}
                              onChange={(event) => {
                                const next = { ...selectedBindings };
                                if (event.target.value) next[target.key] = event.target.value;
                                else delete next[target.key];
                                updateBlock(selectedBlock.id, { bindings: next });
                              }}
                              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs"
                            >
                              <option value="">Use saved block content</option>
                              {productFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </>
          )}
          {initialAssignments.length > 0 && (
            <p className="text-[11px] text-zinc-500">
              Assigned to {initialAssignments.length} product page{initialAssignments.length === 1 ? "" : "s"}.
            </p>
          )}
        </aside>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <div className="pointer-events-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 shadow-lg">
            {activeDrag.label}
          </div>
        )}
      </DragOverlay>
      </DndContext>
    </div>
  );
}
