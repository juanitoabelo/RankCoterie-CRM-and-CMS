import type { PartialSpacing } from "../spacing";

export interface BlockBase {
  id: string;
  type: string;
}

/**
 * Per-breakpoint typography overrides ("style guide"). Each breakpoint can set
 * color, font family, and font size independently; missing values fall through
 * to the next larger breakpoint (or the block's own default styling).
 */
export interface TypographyStyle {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontSizeUnit?: "px" | "em" | "rem" | "%";
}

export type StyleBreakpoints = {
  mobile?: TypographyStyle;
  sm?: TypographyStyle;
  md?: TypographyStyle;
  lg?: TypographyStyle;
};

export interface HeroBlock extends BlockBase {
  type: "hero";
  props: {
    heading: string;
    subheading: string;
    bgColor: string;
    textColor: string;
    style?: StyleBreakpoints;
  };
}

export interface TextBlock extends BlockBase {
  type: "text";
  props: {
    content: string;
    align: "left" | "center" | "right";
    style?: StyleBreakpoints;
    textColor?: string;
    // Persisted by the Content tab. No renderer currently reads these three;
    // they are kept so existing documents round-trip without data loss.
    dropCap?: boolean;
    columns?: number;
    columnsGap?: "default" | "no-gap" | "narrow" | "extended" | "custom";
  };
}

export interface ImageBlock extends BlockBase {
  type: "image";
  props: {
    src: string;
    alt: string;
    caption: string;
    // Content
    imageResolution?: "full" | "large" | "medium" | "thumbnail";
    linkType?: "none" | "custom" | "media";
    linkUrl?: string;
    // Style
    alignment?: "left" | "center" | "right";
    imageWidth?: number; // percentage
    imageMaxWidth?: number; // px
    imageHeight?: number; // px
    imageMaxHeight?: number; // px
    opacity?: number; // 0-100
    hoverOpacity?: number; // 0-100
    borderStyle?: "none" | "solid" | "dashed" | "dotted";
    borderWidth?: number;
    borderColor?: string;
    borderRadiusTop?: number;
    borderRadiusRight?: number;
    borderRadiusBottom?: number;
    borderRadiusLeft?: number;
    boxShadow?: string;
    // Advanced
    margin?: PartialSpacing;
    padding?: PartialSpacing;
    width?: "default" | "full" | "boxed" | "custom";
    alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch";
    zIndex?: number;
    cssId?: string;
    cssClasses?: string;
  };
}

export interface CtaBlock extends BlockBase {
  type: "cta";
  props: {
    heading: string;
    body: string;
    buttonText: string;
    buttonUrl: string;
    bgColor: string;
    style?: StyleBreakpoints;
  };
}

export interface FeaturesBlock extends BlockBase {
  type: "features";
  props: {
    heading: string;
    items: Array<{ icon: string; title: string; description: string }>;
    columns: 2 | 3 | 4;
    style?: StyleBreakpoints;
  };
}

export interface ButtonBlock extends BlockBase {
  type: "button";
  props: {
    text: string;
    url: string;
    align: "left" | "center" | "right";
    variant: "solid" | "outline";
    style?: StyleBreakpoints;
  };
}

export interface EmbedBlock extends BlockBase {
  type: "embed";
  props: {
    html: string;
  };
}

export interface FaqBlock extends BlockBase {
  type: "faq";
  props: {
    heading: string;
    items: Array<{ question: string; answer: string }>;
    style?: StyleBreakpoints;
  };
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  avatar?: string;
}

export interface TestimonialBlock extends BlockBase {
  type: "testimonial";
  props: {
    items: TestimonialItem[];
    display: "grid" | "slider";
    columns: 1 | 2 | 3;
    itemsPerView: number;
    heading?: string;
    style?: StyleBreakpoints;
  };
}

export interface SpacerBlock extends BlockBase {
  type: "spacer";
  props: {
    height: number;
  };
}

export interface DividerBlock extends BlockBase {
  type: "divider";
  props: Record<string, never>;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  props: {
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    align: "left" | "center" | "right" | "justify";
    link?: string;
    linkTarget?: string;
    // Style
    textColor?: string;
    hoverColor?: string;
    blendMode?: string;
    textStroke?: number;
    textShadow?: string;
    textShadowColor?: string;
    textShadowBlur?: number;
    textShadowX?: number;
    textShadowY?: number;
    // Typography
    fontFamily?: string;
    fontWeight?: string;
    fontSize?: number;
    fontSizeUnit?: "px" | "em" | "rem" | "%" | "vw";
    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
    textDecoration?: "none" | "underline" | "overline" | "line-through";
    lineHeight?: number;
    letterSpacing?: number;
    wordSpacing?: number;
    // Advanced - Layout
    width?: "default" | "full" | "boxed" | "inline";
    margin?: { top: string; right: string; bottom: string; left: string };
    padding?: { top: string; right: string; bottom: string; left: string };
    zIndex?: number;
    cssId?: string;
    cssClasses?: string;
    customCss?: string;
    // Advanced - Motion
    entranceAnimation?: string;
    // Advanced - Transform
    rotateX?: number;
    rotateY?: number;
    rotateZ?: number;
    scaleX?: number;
    scaleY?: number;
    skewX?: number;
    skewY?: number;
    offsetX?: number;
    offsetY?: number;
    flipH?: boolean;
    flipV?: boolean;
    // Advanced - Background
    bgColor?: string;
    bgGradient?: string;
    bgImage?: string;
    bgPosition?: string;
    bgSize?: string;
    bgRepeat?: string;
    // Advanced - Border
    borderStyle?: string;
    borderWidth?: number;
    borderColor?: string;
    borderRadiusTop?: number;
    borderRadiusRight?: number;
    borderRadiusBottom?: number;
    borderRadiusLeft?: number;
    boxShadow?: string;
    // Advanced - Responsive
    hideOnDesktop?: boolean;
    hideOnTablet?: boolean;
    hideOnMobile?: boolean;
    style?: StyleBreakpoints;
  };
}

export interface ListBlock extends BlockBase {
  type: "list";
  props: {
    ordered: boolean;
    items: string[];
    style?: StyleBreakpoints;
  };
}

export interface IconListItem {
  text: string;
  icon: string;
  link?: string;
}

export interface IconListBlock extends BlockBase {
  type: "iconList";
  props: {
    items: IconListItem[];
    layout: "list" | "inline";
    applyLinkOn: "full_width" | "icon_only" | "text_only";
    openInNewTab?: boolean;
    linkRel?: string;
    // List style
    spaceBetween?: number;
    align?: "left" | "center" | "right";
    divider?: boolean;
    dividerColor?: string;
    dividerStyle?: string;
    // Icon style
    iconColor?: string;
    iconHoverColor?: string;
    iconSize?: number;
    iconGap?: number;
    iconHorizontalAlign?: "left" | "center" | "right";
    iconVerticalAlign?: "top" | "middle" | "bottom";
    iconVerticalOffset?: number;
    // Text style
    textColor?: string;
    textHoverColor?: string;
    typography?: {
      fontFamily?: string;
      fontWeight?: string;
      fontSize?: number;
      fontSizeUnit?: string;
      lineHeight?: number;
      letterSpacing?: number;
      textTransform?: string;
      textDecoration?: string;
    };
    textShadow?: string;
    // Advanced
    margin?: { top: string; right: string; bottom: string; left: string };
    padding?: { top: string; right: string; bottom: string; left: string };
    cssId?: string;
    cssClasses?: string;
    customCss?: string;
    // Responsive
    hideOnDesktop?: boolean;
    hideOnTablet?: boolean;
    hideOnMobile?: boolean;
  };
}

export interface GoogleMapBlock extends BlockBase {
  type: "googleMap";
  props: {
    location: string;
    zoom: number;
    height: number;
    // CSS Filters
    cssFilterBlur?: number;
    cssFilterBrightness?: number;
    cssFilterContrast?: number;
    cssFilterSaturation?: number;
    cssFilterHue?: number;
    // Advanced
    margin?: { top: string; right: string; bottom: string; left: string };
    padding?: { top: string; right: string; bottom: string; left: string };
    cssId?: string;
    cssClasses?: string;
    customCss?: string;
    displayConditions?: {
      showOnDesktop?: boolean;
      showOnTablet?: boolean;
      showOnMobile?: boolean;
    };
    cacheSettings?: {
      enabled?: boolean;
      duration?: number;
    };
    hideOnDesktop?: boolean;
    hideOnTablet?: boolean;
    hideOnMobile?: boolean;
  };
}

export interface VideoBlock extends BlockBase {
  type: "video";
  props: {
    source: "youtube" | "vimeo" | "dailymotion" | "selfHosted";
    link: string;
    startTime?: number;
    endTime?: number;
    // Video Options
    autoplay?: boolean;
    mute?: boolean;
    loop?: boolean;
    playerControls?: boolean;
    captions?: boolean;
    privacyMode?: boolean;
    lazyLoad?: boolean;
    suggestedVideos?: "current" | "any";
    // Image Overlay
    imageOverlay?: boolean;
    overlayImage?: string;
    overlayImageResolution?: "thumbnail" | "medium" | "medium_large" | "large" | "full";
    playIcon?: boolean;
    playIconType?: "circle" | "upArrow" | "star";
    lightbox?: boolean;
    // Style
    aspectRatio?: "16:9" | "4:3" | "1:1" | "21:9";
    cssFilterBlur?: number;
    cssFilterBrightness?: number;
    cssFilterContrast?: number;
    cssFilterSaturation?: number;
    cssFilterHue?: number;
    // Border
    borderStyle?: "none" | "solid" | "dashed" | "dotted";
    borderWidth?: number;
    borderColor?: string;
    borderRadiusTop?: number;
    borderRadiusRight?: number;
    borderRadiusBottom?: number;
    borderRadiusLeft?: number;
    boxShadow?: string;
    // Advanced
    margin?: { top: string; right: string; bottom: string; left: string };
    padding?: { top: string; right: string; bottom: string; left: string };
    cssId?: string;
    cssClasses?: string;
    customCss?: string;
    displayConditions?: {
      showOnDesktop?: boolean;
      showOnTablet?: boolean;
      showOnMobile?: boolean;
    };
    cacheSettings?: {
      enabled?: boolean;
      duration?: number;
    };
    hideOnDesktop?: boolean;
    hideOnTablet?: boolean;
    hideOnMobile?: boolean;
  };
}

/* ── Blog-Specific Block Types ────────────────────────────────────────────── */

export interface BlogPostGridBlock extends BlockBase {
  type: "blogPostGrid";
  props: {
    heading?: string;
    layout: "grid" | "list" | "masonry";
    /** @deprecated Use columnsDesktop/tablet/mobile instead. Legacy fallback. */
    columns: 1 | 2 | 3;
    columnsDesktop: 1 | 2 | 3 | 4 | 5 | 6;
    columnsTablet?: 1 | 2 | 3 | 4 | 5 | 6;
    columnsMobile?: 1 | 2 | 3 | 4 | 5 | 6;
    postsPerPage: number;
    categoryId: string;
    showCategoryFilter: boolean;
    filterCategories: string[];
    showExcerpt: boolean;
    excerptLength: number;
    showFeaturedImage: boolean;
    showAuthor: boolean;
    showDate: boolean;
    showCategory: boolean;
    showPagination: boolean;
    showSearch: boolean;
    searchPlaceholder: string;
    orderBy: "date" | "title" | "popular";
    sortOrder: "asc" | "desc";
    cardAnimation: "fadeUp" | "zoomIn" | "flip" | "slideIn" | "none";
    hoverEffect: "lift" | "zoom" | "glow" | "overlay" | "none";
    cardStyle?: "bordered" | "shadow" | "minimal";
    imageAspect?: "16:9" | "4:3" | "1:1";
    style?: StyleBreakpoints;
  };
}

export interface ProductGridBlock extends BlockBase {
  type: "productGrid";
  props: {
    heading?: string;
    columnsDesktop: 1 | 2 | 3 | 4 | 5 | 6;
    columnsTablet?: 1 | 2 | 3 | 4 | 5 | 6;
    columnsMobile?: 1 | 2 | 3 | 4 | 5 | 6;
    productsPerPage: number;
    /** Restrict the block to a single category ("" = every category). */
    categoryId: string;
    /** Visual layout: even grid or animated masonry (Isotope-style). */
    layout: "grid" | "isotope";
    /** Show the category filter bar above the grid. */
    showCategoryFilter: boolean;
    /** Categories offered in the filter bar (empty = all categories). */
    filterCategories: string[];
    showExcerpt: boolean;
    excerptLength: number;
    showFeaturedImage: boolean;
    showPrice: boolean;
    showRating: boolean;
    showAddToCart: boolean;
    /** Show the quick add-to-cart button overlaid on the product image. */
    showQuickAddToCart?: boolean;
    /** Label for the add-to-cart button inside the card body. */
    addToCartLabel?: string;
    /** Label for the quick add-to-cart button on the image. */
    quickAddToCartLabel?: string;
    showWishlist: boolean;
    showCategory: boolean;
    showPagination: boolean;
    showCount?: boolean;
    showSort?: boolean;
    showBadges?: boolean;
    showTitle?: boolean;
    orderBy: "price" | "date" | "popular" | "name" | "menuOrder";
    sortOrder: "asc" | "desc";
    /** Entrance animation played for each product card as it scrolls in. */
    cardAnimation: "fadeUp" | "zoomIn" | "flip" | "slideIn" | "none";
    /** Hover treatment applied to each product card. */
    hoverEffect: "lift" | "zoom" | "glow" | "overlay" | "none";
    filterAttributes: Record<string, string[]>;
    minPrice: number;
    maxPrice: number;
    inStockOnly: boolean;
    showSearch: boolean;
    searchPlaceholder: string;
    cardStyle?: "bordered" | "shadow" | "minimal";
    imageAspect?: "16:9" | "4:3" | "1:1";
    style?: StyleBreakpoints;
  };
}

export interface BlogSidebarBlock extends BlockBase {
  type: "blogSidebar";
  props: {
    widgets: Array<
      | { type: "categories"; heading?: string; limit?: number }
      | { type: "recentPosts"; heading?: string; limit?: number }
      | { type: "search"; heading?: string }
      | { type: "tags"; heading?: string }
      | { type: "custom"; heading?: string; content?: string }
    >;
    width?: number;
    position: "left" | "right";
    style?: StyleBreakpoints;
  };
}

export interface ArticleContentBlock extends BlockBase {
  type: "articleContent";
  props: {
    showTitle: boolean;
    showMeta: boolean;
    showAuthor: boolean;
    showDate: boolean;
    showCategory: boolean;
    showFeaturedImage: boolean;
    showSocialShare: boolean;
    showNavigation: boolean;
    maxWidth?: number;
    style?: StyleBreakpoints;
  };
}

export interface ArticleHeroBlock extends BlockBase {
  type: "articleHero";
  props: {
    layout: "standard" | "full-width" | "centered";
    showBreadcrumb: boolean;
    showCategory: boolean;
    showAuthor: boolean;
    showDate: boolean;
    bgColor?: string;
    textColor?: string;
    style?: StyleBreakpoints;
  };
}

/**
 * Public listing application form. Renders the full /apply form (tiers,
 * details, categories, regions, submit) inline on any page.
 */
export interface ListingApplyFormBlock extends BlockBase {
  type: "listingApplyForm";
  props: {
    heading: string;
    subheading: string;
    showHeading: boolean;
    submitLabel: string;
    style?: StyleBreakpoints;
  };
}

export interface SliderSlide {
  src: string;
  alt: string;
  title: string;
  caption: string;
  url: string;
  buttonText: string;
  buttonUrl: string;
}

export type SliderFit = "cover" | "fluid";
export type SliderCaptionLayout = "bottom" | "center";

export interface SliderBlock extends BlockBase {
  type: "slider";
  props: {
    slides: SliderSlide[];
    height: "sm" | "md" | "lg";
    itemsPerView: number;
    imageFit: SliderFit;
    captionLayout: SliderCaptionLayout;
    style?: StyleBreakpoints;
  };
}

/**
 * Content-driven slider block types. Unlike the plain `slider` (a hand-built
 * slideshow), each of these pulls its slides from a specific data source and
 * exposes content settings tailored to that source.
 */
export type ContentSliderType =
  | "blogArticleSlider"
  | "productSlider"
  | "listingSlider"
  | "companySlider"
  | "geoCategorySlider"
  | "sectionSlider"
  | "topicSubTopicSlider"
  | "imageSlider"
  | "videoSlider";

/** Data source a content slider pulls from. */
export type SliderContentSource =
  | "articles"
  | "products"
  | "listings"
  | "companies"
  | "geoCategories"
  | "section"
  | "topics"
  | "static";

/** Sliders whose slides are entered by hand rather than pulled from a data source. */
export const STATIC_SLIDER_TYPES: ContentSliderType[] = ["imageSlider", "videoSlider"];

export interface ContentSliderBlock extends BlockBase {
  type: ContentSliderType;
  props: {
    slides: SliderSlide[];
    height: "sm" | "md" | "lg";
    itemsPerView: number;
    imageFit: SliderFit;
    captionLayout: SliderCaptionLayout;
    /** Which content collection to pull slides from. */
    contentSource: SliderContentSource;
    /** Selected filter ids (multi-select). Empty/undefined = all. */
    categoryIds?: string[];
    sectionIds?: string[];
    topicIds?: string[];
    /** Legacy single-value filters (read for backwards compatibility). */
    categoryId?: string;
    regionId?: string;
    sectionId?: string;
    topicId?: string;
    /** Max slides to pull. 0 = all. */
    limit?: number;
    orderBy?: "date" | "title" | "popular" | "price" | "rating";
    sortOrder?: "asc" | "desc";
    // Carousel behaviour
    autoplay?: boolean;
    showArrows?: boolean;
    showDots?: boolean;
    /** Show the horizontal scroll bar on the slide track. */
    showScrollbar?: boolean;
    // Per-slide display toggles
    showImage?: boolean;
    showTitle?: boolean;
    showCaption?: boolean;
    showMeta?: boolean;
    showButton?: boolean;
    /** Default button label for slides that do not define their own (live sources). */
    buttonText?: string;
    /** Default button link used when a slide has no url of its own. */
    buttonUrl?: string;
    style?: StyleBreakpoints;
  };
}

export type ContentGridSource = "articles" | "feeds";
export type ContentGridColumns = 2 | 3 | 4;

export interface ContentGridBlock extends BlockBase {
  type: "contentGrid";
  props: {
    heading: string;
    source: ContentGridSource;
    /** Empty string means all categories. */
    categoryId: string;
    perPage: number;
    columns: ContentGridColumns;
    showExcerpt: boolean;
    order: "desc" | "asc";
    style?: StyleBreakpoints;
  };
}

export const COLUMN_SPANS = [3, 4, 6, 8, 12] as const;
export type ColumnSpan = (typeof COLUMN_SPANS)[number];

/** Every width available in the 12-column grid used by responsive column settings. */
export const FULL_COLUMN_SPANS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export interface ColumnData {
  id: string;
  /** Desktop width in the 12-column grid (grid units). */
  span: number;
  /** Optional tablet override (grid units). Falls back to `span` on tablet. */
  spanMd?: number;
  /** Optional mobile override (grid units). Falls back to the row's stack-on-mobile default. */
  spanSm?: number;
  blocks: Block[];
  // Layout
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  minHeight?: number;
  // Style
  bgColor?: string;
  bgImage?: string;
  bgPosition?: string;
  bgSize?: string;
  bgRepeat?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  boxShadow?: string;
  // Advanced
  margin?: PartialSpacing;
  padding?: PartialSpacing;
  zindex?: number;
  cssId?: string;
  cssClasses?: string;
}

export interface RowBlock extends BlockBase {
  type: "row";
  props: {
    columns: ColumnData[];
    gap: number; // px between columns
    align: "start" | "center" | "end" | "stretch";
    stackOnMobile: boolean; // columns become full-width on small screens
    // Layout
    direction?: "row" | "column";
    justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
    gapRow?: number; // vertical gap between rows when wrapping
    wrap?: "nowrap" | "wrap";
    // Content Width
    width?: "full" | "boxed";
    maxWidth?: number;
    minHeight?: number;
    height?: "default" | "fitToScreen" | "minHeight";
    overflow?: "default" | "hidden" | "visible" | "scroll" | "auto";
    verticalAlign?: "default" | "top" | "middle" | "bottom" | "spaceBetween" | "spaceAround";
    htmlTag?: "default" | "div" | "section" | "article" | "aside" | "main" | "header" | "footer" | "nav";
    // Style
    bgColor?: string;
    bgImage?: string;
    bgPosition?: string;
    bgSize?: string;
    bgRepeat?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    textColor?: string;
    linkColor?: string;
    linkHoverColor?: string;
    paddingY?: number; // vertical padding in px (legacy)
    padding?: PartialSpacing; // per-side padding
    margin?: PartialSpacing;
    fullWidth?: boolean; // stretch the row edge-to-edge (no horizontal padding)
    borderStyle?: "none" | "solid" | "dashed" | "dotted";
    borderWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    boxShadow?: string;
    // Background Type
    bgType?: "classic" | "gradient" | "video" | "slideshow";
    bgGradientStart?: string;
    bgGradientEnd?: string;
    bgGradientAngle?: number;
    bgGradientType?: "linear" | "radial";
    // Background Overlay
    overlayBgType?: "classic" | "gradient";
    overlayColor2?: string;
    overlayGradientStart?: string;
    overlayGradientEnd?: string;
    overlayGradientAngle?: number;
    // Shape Divider
    shapeDividerTop?: string;
    shapeDividerTopColor?: string;
    shapeDividerTopWidth?: number;
    shapeDividerTopHeight?: number;
    shapeDividerBottom?: string;
    shapeDividerBottomColor?: string;
    shapeDividerBottomWidth?: number;
    shapeDividerBottomHeight?: number;
    // Typography
    headingColor?: string;
    textAlign?: "left" | "center" | "right" | "justify";
    // Advanced
    zindex?: number;
    cssId?: string;
    cssClasses?: string;
    customCss?: string;
    customAttributes?: string;
    // Motion Effects
    scrollingEffects?: boolean;
    sticky?: "none" | "top" | "bottom";
    entranceAnimation?: string;
    // Responsive
    reverseColumnsTablet?: boolean;
    reverseColumnsMobile?: boolean;
    hideOnDesktop?: boolean;
    hideOnTablet?: boolean;
    hideOnMobile?: boolean;
    // Display Conditions
    displayCondition?: string;
    displayConditionDate?: string;
    displayConditionUrl?: string;
  };
}

/**
 * Full-width section container. Wraps one or more rows and renders
 * edge-to-edge with its own background image/color and padding.
 */
export interface SectionBlock extends BlockBase {
  type: "section";
  props: {
    rows: RowBlock[];
    // Layout
    width?: "full" | "boxed";
    maxWidth?: number;
    minHeight?: number;
    direction?: "row" | "column";
    justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
    alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
    gapCol?: number;
    gapRow?: number;
    wrap?: "nowrap" | "wrap";
    height?: "default" | "fitToScreen" | "minHeight";
    overflow?: "default" | "hidden" | "visible" | "scroll" | "auto";
    verticalAlign?: "default" | "top" | "middle" | "bottom" | "spaceBetween" | "spaceAround";
    stretchSection?: boolean;
    htmlTag?: "default" | "div" | "section" | "article" | "aside" | "main" | "header" | "footer" | "nav";
    // Style
    bgColor?: string;
    bgImage?: string;
    bgPosition?: string;
    bgSize?: string;
    bgRepeat?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    textColor?: string;
    linkColor?: string;
    linkHoverColor?: string;
    borderStyle?: "none" | "solid" | "dashed" | "dotted";
    borderWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    boxShadow?: string;
    // Background Type
    bgType?: "classic" | "gradient" | "video" | "slideshow";
    bgGradientStart?: string;
    bgGradientEnd?: string;
    bgGradientAngle?: number;
    bgGradientType?: "linear" | "radial";
    // Background Overlay
    overlayBgType?: "classic" | "gradient";
    overlayColor2?: string;
    overlayGradientStart?: string;
    overlayGradientEnd?: string;
    overlayGradientAngle?: number;
    // Shape Divider
    shapeDividerTop?: string;
    shapeDividerTopColor?: string;
    shapeDividerTopWidth?: number;
    shapeDividerTopHeight?: number;
    shapeDividerBottom?: string;
    shapeDividerBottomColor?: string;
    shapeDividerBottomWidth?: number;
    shapeDividerBottomHeight?: number;
    // Typography
    headingColor?: string;
    textAlign?: "left" | "center" | "right" | "justify";
    // Advanced
    paddingTop?: number;
    paddingBottom?: number;
    margin?: PartialSpacing;
    padding?: PartialSpacing;
    zindex?: number;
    cssId?: string;
    cssClasses?: string;
    customCss?: string;
    customAttributes?: string;
    // Motion Effects
    scrollingEffects?: boolean;
    sticky?: "none" | "top" | "bottom";
    entranceAnimation?: string;
    // Responsive
    reverseColumnsTablet?: boolean;
    reverseColumnsMobile?: boolean;
    hideOnDesktop?: boolean;
    hideOnTablet?: boolean;
    hideOnMobile?: boolean;
    // Display Conditions
    displayCondition?: string;
    displayConditionDate?: string;
    displayConditionUrl?: string;
  };
}

/* ── Shared content blocks ───────────────────────────────────────────────────
   These are defined once here and reused by every builder (page builder, blog,
   geo, listing, product, header/footer, page layout) so a single implementation
   powers them everywhere. */

export interface PricingBlock extends BlockBase {
  type: "pricing";
  props: {
    heading: string;
    subheading: string;
    currency: string;
    period: string;
    columns: 2 | 3 | 4;
    plans: Array<{
      id: string;
      name: string;
      price: string;
      description: string;
      features: string;
      ctaText: string;
      ctaUrl: string;
      featured: boolean;
    }>;
    style?: StyleBreakpoints;
  };
}

export interface LeadFormBlock extends BlockBase {
  type: "leadForm";
  props: {
    heading: string;
    subheading: string;
    showPhone: boolean;
    showCompany: boolean;
    showMessage: boolean;
    submitLabel: string;
    successMessage: string;
    style?: StyleBreakpoints;
  };
}

export interface StatsBlock extends BlockBase {
  type: "stats";
  props: {
    heading: string;
    columns: 2 | 3 | 4;
    items: Array<{ id: string; value: string; label: string }>;
    style?: StyleBreakpoints;
  };
}

export interface LogosBlock extends BlockBase {
  type: "logos";
  props: {
    heading: string;
    columns: 3 | 4 | 5 | 6;
    grayscale: boolean;
    monochrome?: boolean;
    items: Array<{ id: string; src: string; alt: string; url: string }>;
    style?: StyleBreakpoints;
  };
}

export interface TabsBlock extends BlockBase {
  type: "tabs";
  props: {
    items: Array<{ id: string; label: string; content: string }>;
    style?: StyleBreakpoints;
  };
}

export interface SearchHeroBlock extends BlockBase {
  type: "searchHero";
  props: {
    heading: string;
    subheading: string;
    placeholder: string;
    buttonLabel: string;
    searchUrl: string;
    showCategory: boolean;
    showLocation: boolean;
    bgColor: string;
    textColor: string;
    style?: StyleBreakpoints;
  };
}

export interface ListingCategoriesBlock extends BlockBase {
  type: "listingCategories";
  props: {
    heading: string;
    columns: 2 | 3 | 4;
    showCounts: boolean;
    limit: number;
    basePath: string;
    style?: StyleBreakpoints;
  };
}

export interface FeaturedListingsBlock extends BlockBase {
  type: "featuredListings";
  props: {
    heading: string;
    columns: 2 | 3 | 4;
    limit: number;
    categoryId: string;
    style?: StyleBreakpoints;
  };
}

export interface MapListingsBlock extends BlockBase {
  type: "mapListings";
  props: {
    heading: string;
    location: string;
    zoom: number;
    height: number;
    limit: number;
    columns: 1 | 2 | 3;
    style?: StyleBreakpoints;
  };
}

export interface TocBlock extends BlockBase {
  type: "toc";
  props: {
    heading: string;
    maxDepth: 2 | 3 | 4;
    sticky: boolean;
    style?: StyleBreakpoints;
  };
}

export interface RelatedPostsBlock extends BlockBase {
  type: "relatedPosts";
  props: {
    heading: string;
    columns: 2 | 3 | 4;
    limit: number;
    style?: StyleBreakpoints;
  };
}

export interface AuthorBioBlock extends BlockBase {
  type: "authorBio";
  props: {
    name: string;
    role: string;
    bio: string;
    avatar: string;
    style?: StyleBreakpoints;
  };
}

export interface ShareButtonsBlock extends BlockBase {
  type: "shareButtons";
  props: {
    heading: string;
    networks: string[];
    style?: StyleBreakpoints;
  };
}

export interface PostMetaBlock extends BlockBase {
  type: "postMeta";
  props: {
    showAuthor: boolean;
    showDate: boolean;
    showReadTime: boolean;
    showCategory: boolean;
    style?: StyleBreakpoints;
  };
}

export interface NewsletterBlock extends BlockBase {
  type: "newsletter";
  props: {
    heading: string;
    subheading: string;
    placeholder: string;
    buttonLabel: string;
    successMessage: string;
    style?: StyleBreakpoints;
  };
}

export interface ProductCategoriesBlock extends BlockBase {
  type: "productCategories";
  props: {
    heading: string;
    columns: 2 | 3 | 4;
    showCounts: boolean;
    limit: number;
    basePath: string;
    style?: StyleBreakpoints;
  };
}

export interface ProductSpotlightBlock extends BlockBase {
  type: "productSpotlight";
  props: {
    heading: string;
    productId: string;
    buttonLabel: string;
    style?: StyleBreakpoints;
  };
}

export interface AnnouncementBlock extends BlockBase {
  type: "announcement";
  props: {
    text: string;
    linkText: string;
    linkUrl: string;
    marquee: boolean;
    bgColor: string;
    textColor: string;
    style?: StyleBreakpoints;
  };
}

export interface BreadcrumbsBlock extends BlockBase {
  type: "breadcrumbs";
  props: {
    separator: string;
    showHome: boolean;
    style?: StyleBreakpoints;
  };
}

export interface SocialLinksBlock extends BlockBase {
  type: "socialLinks";
  props: {
    heading: string;
    size: "sm" | "md" | "lg";
    items: Array<{ id: string; network: string; url: string }>;
    style?: StyleBreakpoints;
  };
}

export interface CountdownBlock extends BlockBase {
  type: "countdown";
  props: {
    heading: string;
    targetDate: string;
    expiredText: string;
    style?: StyleBreakpoints;
  };
}

export interface GalleryBlock extends BlockBase {
  type: "gallery";
  props: {
    columns: 2 | 3 | 4;
    masonry: boolean;
    images: Array<{ id: string; src: string; alt: string; caption: string }>;
    style?: StyleBreakpoints;
  };
}

export interface StepsBlock extends BlockBase {
  type: "steps";
  props: {
    heading: string;
    items: Array<{ id: string; title: string; description: string }>;
    style?: StyleBreakpoints;
  };
}

export interface ShapeDividerBlock extends BlockBase {
  type: "shapeDivider";
  props: {
    shape: "wave" | "tilt" | "curve" | "triangle" | "zigzag";
    color: string;
    height: number;
    flip: boolean;
    style?: StyleBreakpoints;
  };
}

export interface ReviewsBlock extends BlockBase {
  type: "reviews";
  props: {
    heading: string;
    subheading: string;
    showSummary: boolean;
    columns: 1 | 2 | 3;
    items: Array<{ id: string; author: string; rating: number; date: string; text: string; avatar: string }>;
    style?: StyleBreakpoints;
  };
}

export interface RelatedListingsBlock extends BlockBase {
  type: "relatedListings";
  props: {
    heading: string;
    subheading: string;
    columns: 2 | 3 | 4;
    items: Array<{ id: string; title: string; image: string; location: string; rating: number; url: string }>;
    style?: StyleBreakpoints;
  };
}

export interface BusinessInfoBlock extends BlockBase {
  type: "businessInfo";
  props: {
    heading: string;
    name: string;
    tagline: string;
    image: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    hours: Array<{ id: string; day: string; time: string }>;
    style?: StyleBreakpoints;
  };
}

export interface FacetBarBlock extends BlockBase {
  type: "facetBar";
  props: {
    heading: string;
    sticky: boolean;
    groups: Array<{ id: string; label: string; options: string[] }>;
    style?: StyleBreakpoints;
  };
}

export interface ComparisonTableBlock extends BlockBase {
  type: "comparisonTable";
  props: {
    heading: string;
    highlightCol: number;
    rows: Array<{ id: string; label: string }>;
    columns: Array<{ id: string; name: string; price: string; values: boolean[] }>;
    style?: StyleBreakpoints;
  };
}

export interface TeamBlock extends BlockBase {
  type: "team";
  props: {
    heading: string;
    subheading: string;
    columns: 2 | 3 | 4;
    members: Array<{ id: string; name: string; role: string; image: string; bio: string; link: string }>;
    style?: StyleBreakpoints;
  };
}

export type Block =
  | HeroBlock
  | TextBlock
  | ImageBlock
  | CtaBlock
  | FeaturesBlock
  | ButtonBlock
  | EmbedBlock
  | FaqBlock
  | TestimonialBlock
  | SpacerBlock
  | DividerBlock
  | HeadingBlock
  | ListBlock
  | IconListBlock
  | GoogleMapBlock
  | VideoBlock
  | SliderBlock
  | ContentSliderBlock
  | ContentGridBlock
  | BlogPostGridBlock
  | ProductGridBlock
  | BlogSidebarBlock
  | ArticleContentBlock
  | ArticleHeroBlock
  | ListingApplyFormBlock
  | PricingBlock
  | LeadFormBlock
  | StatsBlock
  | LogosBlock
  | TabsBlock
  | SearchHeroBlock
  | ListingCategoriesBlock
  | FeaturedListingsBlock
  | MapListingsBlock
  | TocBlock
  | RelatedPostsBlock
  | AuthorBioBlock
  | ShareButtonsBlock
  | PostMetaBlock
  | NewsletterBlock
  | ProductCategoriesBlock
  | ProductSpotlightBlock
  | AnnouncementBlock
  | BreadcrumbsBlock
  | SocialLinksBlock
  | CountdownBlock
  | GalleryBlock
  | StepsBlock
  | ShapeDividerBlock
  | ReviewsBlock
  | RelatedListingsBlock
  | BusinessInfoBlock
  | FacetBarBlock
  | ComparisonTableBlock
  | TeamBlock
  | RowBlock
  | SectionBlock;

export type BlockType = Block["type"];

export function isRowBlock(block: Block): block is RowBlock {
  return block.type === "row";
}

export function isSectionBlock(block: Block): block is SectionBlock {
  return block.type === "section";
}

/** Block types allowed inside a row column (i.e. everything except rows and sections). */
export const LEAF_BLOCK_TYPES: BlockType[] = [
  "hero",
  "text",
  "image",
  "cta",
  "features",
  "button",
  "embed",
  "faq",
  "testimonial",
  "spacer",
  "divider",
  "heading",
  "list",
  "iconList",
  "googleMap",
  "video",
  "slider",
  "blogArticleSlider",
  "productSlider",
  "listingSlider",
  "companySlider",
  "geoCategorySlider",
  "sectionSlider",
  "topicSubTopicSlider",
  "imageSlider",
  "videoSlider",
  "contentGrid",
  "blogPostGrid",
  "productGrid",
  "blogSidebar",
  "articleContent",
  "articleHero",
  "listingApplyForm",
  "pricing",
  "leadForm",
  "stats",
  "logos",
  "tabs",
  "searchHero",
  "listingCategories",
  "featuredListings",
  "mapListings",
  "toc",
  "relatedPosts",
  "authorBio",
  "shareButtons",
  "postMeta",
  "newsletter",
  "productCategories",
  "productSpotlight",
  "announcement",
  "breadcrumbs",
  "socialLinks",
  "countdown",
  "gallery",
  "steps",
  "shapeDivider",
  "reviews",
  "relatedListings",
  "businessInfo",
  "facetBar",
  "comparisonTable",
  "team",
];

/** Blocks shared across every builder — defined once, reused everywhere. */
export const SHARED_BLOCK_TYPES: BlockType[] = [
  "pricing",
  "leadForm",
  "stats",
  "logos",
  "tabs",
  "searchHero",
  "listingCategories",
  "featuredListings",
  "mapListings",
  "toc",
  "relatedPosts",
  "authorBio",
  "shareButtons",
  "postMeta",
  "newsletter",
  "productCategories",
  "productSpotlight",
  "announcement",
  "breadcrumbs",
  "socialLinks",
  "countdown",
  "gallery",
  "steps",
  "shapeDivider",
  "reviews",
  "relatedListings",
  "businessInfo",
  "facetBar",
  "comparisonTable",
  "team",
];

/** Id prefix used by draggable palette items so drag events can be distinguished from real blocks. */
export const PALETTE_PREFIX = "palette:";
/** Id prefix used by draggable prebuilt row-layout items. */
export const LAYOUT_PREFIX = "layout:";
/** Id prefix used by draggable snippet items. */
export const SNIPPET_PREFIX = "snippet:";

/**
 * Droppable id standing for the visual canvas as a whole, as opposed to a
 * specific block/row/column. Registering it means a drag from the palette always
 * has a target — including on an empty canvas, where no element anchors exist.
 * `normalizeDropTarget` maps it to "top level" for the tree helpers.
 */
export const CANVAS_ROOT_ID = "__canvas__";

export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  defaults: Block["props"];
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "row",
    label: "Row / Columns",
    icon: "▦",
    defaults: {
      columns: [],
      gap: 24,
      align: "stretch",
      stackOnMobile: true,
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingY: 10,
      fullWidth: false,
    },
  },
  {
    type: "section",
    label: "Section (Full Width)",
    icon: "▣",
    defaults: {
      rows: [],
      bgColor: "#f4f4f5",
      bgImage: "",
      textColor: "#18181b",
      paddingTop: 10,
      paddingBottom: 10,
    },
  },
  {
    type: "hero",
    label: "Hero",
    icon: "⬛",
    defaults: {
      heading: "Welcome",
      subheading: "Your subheading goes here",
      bgColor: "#18181b",
      textColor: "#ffffff",
    },
  },
  {
    type: "text",
    label: "Text",
    icon: "📝",
    defaults: {
      content: "<p>Write your content here...</p>",
      align: "left",
    },
  },
  {
    type: "image",
    label: "Image",
    icon: "🖼",
    defaults: {
      src: "",
      alt: "",
      caption: "",
      width: "full",
    },
  },
  {
    type: "cta",
    label: "Call to Action",
    icon: "🔘",
    defaults: {
      heading: "Ready to get started?",
      body: "Join thousands of satisfied customers.",
      buttonText: "Get Started",
      buttonUrl: "#",
      bgColor: "#f4f4f5",
    },
  },
  {
    type: "features",
    label: "Features",
    icon: "📊",
    defaults: {
      heading: "Our Features",
      items: [
        { icon: "✓", title: "Feature One", description: "Description of feature one" },
        { icon: "✓", title: "Feature Two", description: "Description of feature two" },
        { icon: "✓", title: "Feature Three", description: "Description of feature three" },
      ],
      columns: 3,
    },
  },
  {
    type: "button",
    label: "Button / Link",
    icon: "🔗",
    defaults: {
      text: "Learn more",
      url: "#",
      align: "left",
      variant: "solid",
    },
  },
  {
    type: "embed",
    label: "Embed / HTML",
    icon: "</>",
    defaults: {
      html: "",
    },
  },
  {
    type: "faq",
    label: "FAQ / Accordion",
    icon: "❓",
    defaults: {
      heading: "Frequently Asked Questions",
      items: [
        { question: "Your question here?", answer: "The answer goes here." },
      ],
    },
  },
  {
    type: "testimonial",
    label: "Testimonial",
    icon: "💬",
    defaults: {
      items: [
        {
          quote: "This changed everything for us.",
          author: "Jane Doe",
          role: "Founder, Acme Co.",
          rating: 5,
        },
      ],
      display: "grid",
      columns: 2,
      itemsPerView: 2,
      heading: "",
    },
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: "↕",
    defaults: { height: 48 },
  },
  {
    type: "divider",
    label: "Divider",
    icon: "—",
    defaults: {},
  },
  {
    type: "heading",
    label: "Heading (H1–H6)",
    icon: "H",
    defaults: {
      text: "Section heading",
      level: 2,
      align: "left",
    },
  },
  {
    type: "list",
    label: "List",
    icon: "≡",
    defaults: {
      ordered: false,
      items: ["First item", "Second item", "Third item"],
    },
  },
  {
    type: "iconList",
    label: "Icon List",
    icon: "✔",
    defaults: {
      items: [
        { text: "List Item #1", icon: "✔", link: "" },
        { text: "List Item #2", icon: "✕", link: "" },
        { text: "List Item #3", icon: "◉", link: "" },
      ],
      layout: "list",
      applyLinkOn: "full_width",
      spaceBetween: 0,
      align: "left",
      divider: false,
      iconColor: "#1e40af",
      iconSize: 14,
      iconGap: 8,
    },
  },
  {
    type: "googleMap",
    label: "Google Maps",
    icon: "🗺",
    defaults: {
      location: "London Eye, London, United Kingdom",
      zoom: 10,
      height: 400,
      cssFilterBlur: 0,
      cssFilterBrightness: 100,
      cssFilterContrast: 100,
      cssFilterSaturation: 100,
      cssFilterHue: 0,
    },
  },
  {
    type: "video",
    label: "Video",
    icon: "▶",
    defaults: {
      source: "youtube",
      link: "",
      startTime: 0,
      endTime: 0,
      autoplay: false,
      mute: false,
      loop: false,
      playerControls: true,
      captions: false,
      privacyMode: false,
      lazyLoad: false,
      suggestedVideos: "current",
      imageOverlay: false,
      overlayImage: "",
      overlayImageResolution: "full",
      playIcon: true,
      playIconType: "circle",
      lightbox: false,
      aspectRatio: "16:9",
      cssFilterBlur: 0,
      cssFilterBrightness: 100,
      cssFilterContrast: 100,
      cssFilterSaturation: 100,
      cssFilterHue: 0,
    },
  },
  {
    type: "slider",
    label: "Slider",
    icon: "◫",
    defaults: {
      slides: [{ src: "", alt: "", title: "", caption: "", url: "", buttonText: "", buttonUrl: "" }],
      height: "md",
      itemsPerView: 1,
      imageFit: "cover",
      captionLayout: "bottom",
    },
  },
  {
    type: "blogArticleSlider",
    label: "Blog/Article Slider",
    icon: "📝",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 3,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "articles",
      categoryIds: [],
      limit: 9,
      orderBy: "date",
      sortOrder: "desc",
      autoplay: true,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: true,
      showCaption: true,
      showMeta: true,
      showButton: false,
      style: {},
    },
  },
  {
    type: "productSlider",
    label: "Product Slider",
    icon: "🛒",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 4,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "products",
      categoryIds: [],
      limit: 12,
      orderBy: "date",
      sortOrder: "desc",
      autoplay: true,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: true,
      showCaption: false,
      showMeta: true,
      showButton: true,
      style: {},
    },
  },
  {
    type: "listingSlider",
    label: "Directory Listing Slider",
    icon: "📍",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 3,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "listings",
      categoryIds: [],
      limit: 9,
      orderBy: "popular",
      sortOrder: "desc",
      autoplay: true,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: true,
      showCaption: true,
      showMeta: true,
      showButton: false,
      style: {},
    },
  },
  {
    type: "companySlider",
    label: "Company Listing Slider",
    icon: "🏢",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 2,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "companies",
      categoryIds: [],
      limit: 6,
      orderBy: "title",
      sortOrder: "asc",
      autoplay: true,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: true,
      showCaption: true,
      showMeta: true,
      showButton: true,
      style: {},
    },
  },
  {
    type: "geoCategorySlider",
    label: "Geo Category Slider",
    icon: "🗺",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 3,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "geoCategories",
      categoryIds: [],
      limit: 9,
      orderBy: "title",
      sortOrder: "asc",
      autoplay: true,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: true,
      showCaption: true,
      showMeta: false,
      showButton: false,
      style: {},
    },
  },
  {
    type: "sectionSlider",
    label: "Section Slider",
    icon: "▣",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 3,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "section",
      sectionIds: [],
      limit: 9,
      orderBy: "title",
      sortOrder: "asc",
      autoplay: true,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: true,
      showCaption: true,
      showMeta: false,
      showButton: true,
      style: {},
    },
  },
  {
    type: "topicSubTopicSlider",
    label: "Topic and Sub Topic Slider",
    icon: "🏷",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 3,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "topics",
      topicIds: [],
      limit: 9,
      orderBy: "title",
      sortOrder: "asc",
      autoplay: true,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: true,
      showCaption: true,
      showMeta: false,
      showButton: false,
      style: {},
    },
  },
  {
    type: "imageSlider",
    label: "Image Slider",
    icon: "🖼",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 5,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "static",
      limit: 0,
      autoplay: true,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: false,
      showCaption: true,
      showMeta: false,
      showButton: false,
      style: {},
    },
  },
  {
    type: "videoSlider",
    label: "Video Slider",
    icon: "📺",
    defaults: {
      slides: [],
      height: "md",
      itemsPerView: 3,
      imageFit: "cover",
      captionLayout: "bottom",
      contentSource: "static",
      limit: 0,
      autoplay: false,
      showArrows: true,
      showDots: true,
      showImage: true,
      showTitle: true,
      showCaption: true,
      showMeta: false,
      showButton: false,
      style: {},
    },
  },
  {
    type: "contentGrid",
    label: "Article / Feed grid",
    icon: "▦",
    defaults: {
      heading: "Latest Articles",
      source: "articles",
      categoryId: "",
      perPage: 6,
      columns: 3,
      showExcerpt: true,
      order: "desc",
    },
  },
  {
    type: "blogPostGrid",
    label: "Blog Post Grid",
    icon: "📰",
    defaults: {
      heading: "Latest Posts",
      layout: "grid",
      columns: 3,
      columnsDesktop: 3,
      columnsTablet: 2,
      columnsMobile: 1,
      postsPerPage: 9,
      categoryId: "",
      showCategoryFilter: false,
      filterCategories: [],
      showExcerpt: true,
      excerptLength: 150,
      showFeaturedImage: true,
      showAuthor: true,
      showDate: true,
      showCategory: true,
      showPagination: true,
      showSearch: false,
      searchPlaceholder: "Search posts...",
      orderBy: "date",
      sortOrder: "desc",
      cardAnimation: "fadeUp",
      hoverEffect: "lift",
      cardStyle: "shadow",
      imageAspect: "16:9",
    },
  },
  {
    type: "productGrid",
    label: "Product Grid",
    icon: "🛒",
    defaults: {
      heading: "Products",
      columnsDesktop: 3,
      columnsTablet: 2,
      columnsMobile: 1,
      productsPerPage: 9,
      categoryId: "",
      layout: "grid",
      showCategoryFilter: false,
      showExcerpt: true,
      excerptLength: 150,
      showFeaturedImage: true,
      showPrice: true,
      showRating: true,
      showAddToCart: true,
      showQuickAddToCart: true,
      addToCartLabel: "Add to cart",
      quickAddToCartLabel: "Add to cart",
      showWishlist: true,
      showCategory: true,
      showPagination: true,
      orderBy: "date",
      sortOrder: "desc",
      cardAnimation: "fadeUp",
      hoverEffect: "lift",
      filterCategories: [],
      filterAttributes: {},
      minPrice: 0,
      maxPrice: 0,
      inStockOnly: false,
      showSearch: true,
      searchPlaceholder: "Search products...",
      showCount: true,
      showSort: true,
      showBadges: true,
      showTitle: true,
      cardStyle: "shadow",
      imageAspect: "16:9",
    },
  },
  {
    type: "blogSidebar",
    label: "Blog Sidebar",
    icon: "📑",
    defaults: {
      widgets: [
        { type: "search", heading: "Search" },
        { type: "categories", heading: "Categories", limit: 10 },
        { type: "recentPosts", heading: "Recent Posts", limit: 5 },
      ],
      width: 300,
      position: "right",
    },
  },
  {
    type: "articleContent",
    label: "Article Content",
    icon: "📄",
    defaults: {
      showTitle: true,
      showMeta: true,
      showAuthor: true,
      showDate: true,
      showCategory: true,
      showFeaturedImage: true,
      showSocialShare: true,
      showNavigation: true,
      maxWidth: 720,
    },
  },
  {
    type: "articleHero",
    label: "Article Hero",
    icon: "🎯",
    defaults: {
      layout: "standard",
      showBreadcrumb: true,
      showCategory: true,
      showAuthor: true,
      showDate: true,
    },
  },
  {
    type: "listingApplyForm",
    label: "Listing Apply Form",
    icon: "📝",
    defaults: {
      heading: "Apply to get listed",
      subheading:
        "Get your program listed in the directory with a local SEO page per region. Pay a one-time setup fee plus a monthly subscription after review.",
      showHeading: true,
      submitLabel: "Continue to payment",
    },
  },
  {
    type: "pricing",
    label: "Pricing Table",
    icon: "💳",
    defaults: {
      heading: "Simple, transparent pricing",
      subheading: "Choose the plan that fits your needs.",
      currency: "$",
      period: "/mo",
      columns: 3,
      plans: [
        {
          id: "plan-1",
          name: "Starter",
          price: "19",
          description: "For individuals getting started.",
          features: "1 project\nEmail support\nBasic analytics",
          ctaText: "Get started",
          ctaUrl: "#",
          featured: false,
        },
        {
          id: "plan-2",
          name: "Pro",
          price: "49",
          description: "For growing teams.",
          features: "10 projects\nPriority support\nAdvanced analytics\nCustom domain",
          ctaText: "Get started",
          ctaUrl: "#",
          featured: true,
        },
        {
          id: "plan-3",
          name: "Business",
          price: "99",
          description: "For large organisations.",
          features: "Unlimited projects\n24/7 support\nSSO & audit logs\nDedicated manager",
          ctaText: "Contact sales",
          ctaUrl: "#",
          featured: false,
        },
      ],
      style: {},
    },
  },
  {
    type: "leadForm",
    label: "Contact / Lead Form",
    icon: "✉️",
    defaults: {
      heading: "Get in touch",
      subheading: "Fill out the form and we will get back to you shortly.",
      showPhone: true,
      showCompany: true,
      showMessage: true,
      submitLabel: "Send message",
      successMessage: "Thanks! We will be in touch soon.",
      style: {},
    },
  },
  {
    type: "stats",
    label: "Stats / Counters",
    icon: "🔢",
    defaults: {
      heading: "",
      columns: 4,
      items: [
        { id: "stat-1", value: "500+", label: "Listings" },
        { id: "stat-2", value: "12k", label: "Happy customers" },
        { id: "stat-3", value: "48", label: "States covered" },
        { id: "stat-4", value: "4.9", label: "Average rating" },
      ],
      style: {},
    },
  },
  {
    type: "logos",
    label: "Logo Cloud",
    icon: "🏷",
    defaults: {
      heading: "Trusted by teams everywhere",
      columns: 5,
      grayscale: true,
      items: [
        { id: "logo-1", src: "", alt: "Partner logo", url: "" },
        { id: "logo-2", src: "", alt: "Partner logo", url: "" },
        { id: "logo-3", src: "", alt: "Partner logo", url: "" },
        { id: "logo-4", src: "", alt: "Partner logo", url: "" },
        { id: "logo-5", src: "", alt: "Partner logo", url: "" },
      ],
      style: {},
    },
  },
  {
    type: "tabs",
    label: "Tabs",
    icon: "🗂",
    defaults: {
      items: [
        { id: "tab-1", label: "Overview", content: "Overview content goes here." },
        { id: "tab-2", label: "Features", content: "Feature details go here." },
        { id: "tab-3", label: "Pricing", content: "Pricing details go here." },
      ],
      style: {},
    },
  },
  {
    type: "searchHero",
    label: "Directory Search Hero",
    icon: "🔍",
    defaults: {
      heading: "Find what you need",
      subheading: "Search thousands of verified listings near you.",
      placeholder: "Search by name or keyword…",
      buttonLabel: "Search",
      searchUrl: "/search",
      showCategory: true,
      showLocation: true,
      bgColor: "#111827",
      textColor: "#ffffff",
      style: {},
    },
  },
  {
    type: "listingCategories",
    label: "Listing Categories Grid",
    icon: "🗺",
    defaults: {
      heading: "Browse by category",
      columns: 3,
      showCounts: true,
      limit: 9,
      basePath: "/g/",
      style: {},
    },
  },
  {
    type: "featuredListings",
    label: "Featured Listings",
    icon: "⭐",
    defaults: {
      heading: "Featured listings",
      columns: 3,
      limit: 6,
      categoryId: "",
      style: {},
    },
  },
  {
    type: "mapListings",
    label: "Map + Listings",
    icon: "📍",
    defaults: {
      heading: "Find us on the map",
      location: "",
      zoom: 11,
      height: 420,
      limit: 6,
      columns: 2,
      style: {},
    },
  },
  {
    type: "toc",
    label: "Table of Contents",
    icon: "📑",
    defaults: {
      heading: "On this page",
      maxDepth: 3,
      sticky: false,
      style: {},
    },
  },
  {
    type: "relatedPosts",
    label: "Related Posts",
    icon: "🧩",
    defaults: {
      heading: "Related posts",
      columns: 3,
      limit: 3,
      style: {},
    },
  },
  {
    type: "authorBio",
    label: "Author Bio",
    icon: "🧑",
    defaults: {
      name: "Jane Doe",
      role: "Author",
      bio: "Jane writes about local services and how to find the best providers near you.",
      avatar: "",
      style: {},
    },
  },
  {
    type: "shareButtons",
    label: "Share Buttons",
    icon: "🔗",
    defaults: {
      heading: "Share this",
      networks: ["facebook", "x", "linkedin", "email"],
      style: {},
    },
  },
  {
    type: "postMeta",
    label: "Post Meta",
    icon: "🗓",
    defaults: {
      showAuthor: true,
      showDate: true,
      showReadTime: true,
      showCategory: true,
      style: {},
    },
  },
  {
    type: "newsletter",
    label: "Newsletter Signup",
    icon: "📧",
    defaults: {
      heading: "Subscribe to our newsletter",
      subheading: "Get the latest updates straight to your inbox.",
      placeholder: "you@example.com",
      buttonLabel: "Subscribe",
      successMessage: "Thanks for subscribing!",
      style: {},
    },
  },
  {
    type: "productCategories",
    label: "Product Categories Grid",
    icon: "🛍",
    defaults: {
      heading: "Shop by category",
      columns: 3,
      showCounts: true,
      limit: 9,
      basePath: "/g/",
      style: {},
    },
  },
  {
    type: "productSpotlight",
    label: "Product Spotlight",
    icon: "✨",
    defaults: {
      heading: "Featured product",
      productId: "",
      buttonLabel: "View product",
      style: {},
    },
  },
  {
    type: "announcement",
    label: "Announcement Bar",
    icon: "📣",
    defaults: {
      text: "🎉 New: Save 20% on annual plans this month.",
      linkText: "Learn more",
      linkUrl: "#",
      marquee: false,
      bgColor: "#111827",
      textColor: "#ffffff",
      style: {},
    },
  },
  {
    type: "breadcrumbs",
    label: "Breadcrumbs",
    icon: "🧭",
    defaults: {
      separator: "/",
      showHome: true,
      style: {},
    },
  },
  {
    type: "socialLinks",
    label: "Social Links",
    icon: "📱",
    defaults: {
      heading: "",
      size: "md",
      items: [
        { id: "social-1", network: "facebook", url: "#" },
        { id: "social-2", network: "x", url: "#" },
        { id: "social-3", network: "instagram", url: "#" },
        { id: "social-4", network: "linkedin", url: "#" },
      ],
      style: {},
    },
  },
  {
    type: "countdown",
    label: "Countdown Timer",
    icon: "⏳",
    defaults: {
      heading: "Offer ends soon",
      targetDate: "",
      expiredText: "This offer has ended.",
      style: {},
    },
  },
  {
    type: "gallery",
    label: "Gallery",
    icon: "🖼",
    defaults: {
      columns: 3,
      masonry: false,
      images: [
        { id: "img-1", src: "", alt: "Gallery image", caption: "" },
        { id: "img-2", src: "", alt: "Gallery image", caption: "" },
        { id: "img-3", src: "", alt: "Gallery image", caption: "" },
        { id: "img-4", src: "", alt: "Gallery image", caption: "" },
      ],
      style: {},
    },
  },
  {
    type: "steps",
    label: "Steps / Timeline",
    icon: "🪜",
    defaults: {
      heading: "How it works",
      items: [
        { id: "step-1", title: "Search", description: "Browse listings by category and location." },
        { id: "step-2", title: "Compare", description: "Review ratings, photos and pricing." },
        { id: "step-3", title: "Connect", description: "Reach out and get the job done." },
      ],
      style: {},
    },
  },
  {
    type: "shapeDivider",
    label: "Decorative Divider",
    icon: "🌊",
    defaults: {
      shape: "wave",
      color: "#e4e4e7",
      height: 80,
      flip: false,
      style: {},
    },
  },
  {
    type: "reviews",
    label: "Reviews / Rating Summary",
    icon: "⭐",
    defaults: {
      heading: "What our customers say",
      subheading: "",
      showSummary: true,
      columns: 3,
      items: [
        { id: "rev-1", author: "Jane Doe", rating: 5, date: "", text: "Fantastic service — highly recommended.", avatar: "" },
        { id: "rev-2", author: "John Smith", rating: 4, date: "", text: "Great experience overall.", avatar: "" },
        { id: "rev-3", author: "Alex Lee", rating: 5, date: "", text: "Quick, friendly and professional.", avatar: "" },
      ],
      style: {},
    },
  },
  {
    type: "relatedListings",
    label: "Related / Nearby Listings",
    icon: "🧭",
    defaults: {
      heading: "Related listings",
      subheading: "",
      columns: 3,
      items: [
        { id: "rel-1", title: "Listing one", image: "", location: "", rating: 0, url: "#" },
        { id: "rel-2", title: "Listing two", image: "", location: "", rating: 0, url: "#" },
        { id: "rel-3", title: "Listing three", image: "", location: "", rating: 0, url: "#" },
      ],
      style: {},
    },
  },
  {
    type: "businessInfo",
    label: "Business Info / Contact Card",
    icon: "🏢",
    defaults: {
      heading: "",
      name: "Your business name",
      tagline: "",
      image: "",
      address: "123 Main Street, City",
      phone: "",
      email: "",
      website: "",
      hours: [
        { id: "hr-1", day: "Mon – Fri", time: "9:00 – 17:00" },
        { id: "hr-2", day: "Saturday", time: "10:00 – 14:00" },
        { id: "hr-3", day: "Sunday", time: "Closed" },
      ],
      style: {},
    },
  },
  {
    type: "facetBar",
    label: "Filters / Facet Bar",
    icon: "🎛",
    defaults: {
      heading: "",
      sticky: false,
      groups: [
        { id: "facet-1", label: "Category", options: ["All", "Service", "Retail", "Food"] },
        { id: "facet-2", label: "Location", options: ["Any", "Downtown", "Uptown"] },
      ],
      style: {},
    },
  },
  {
    type: "comparisonTable",
    label: "Comparison Table",
    icon: "📊",
    defaults: {
      heading: "Compare plans",
      highlightCol: 1,
      rows: [
        { id: "row-1", label: "Price" },
        { id: "row-2", label: "Support" },
        { id: "row-3", label: "Custom domain" },
      ],
      columns: [
        { id: "col-1", name: "Basic", price: "$9", values: [true, false, false] },
        { id: "col-2", name: "Pro", price: "$29", values: [true, true, true] },
        { id: "col-3", name: "Business", price: "$99", values: [true, true, true] },
      ],
      style: {},
    },
  },
  {
    type: "team",
    label: "Team Grid",
    icon: "👥",
    defaults: {
      heading: "Meet the team",
      subheading: "",
      columns: 3,
      members: [
        { id: "tm-1", name: "Jane Doe", role: "Founder", image: "", bio: "", link: "" },
        { id: "tm-2", name: "John Smith", role: "Operations", image: "", bio: "", link: "" },
        { id: "tm-3", name: "Alex Lee", role: "Support", image: "", bio: "", link: "" },
      ],
      style: {},
    },
  },
];

export interface RowLayout {
  id: string;
  label: string;
  icon: string;
  spans: number[];
}

/** Prebuilt row layouts — clicking/dragging one inserts a fully formed row. */
export const ROW_LAYOUTS: RowLayout[] = [
  { id: "two-halves", label: "2 columns (6+6)", icon: "▥", spans: [6, 6] },
  { id: "logo-nav", label: "Logo + Nav (3+9)", icon: "▤", spans: [3, 9] },
  { id: "nav-logo", label: "Nav + Logo (9+3)", icon: "▧", spans: [9, 3] },
  { id: "content-sidebar", label: "Content + Sidebar (8+4)", icon: "▥", spans: [8, 4] },
  { id: "sidebar-content", label: "Sidebar + Content (4+8)", icon: "▥", spans: [4, 8] },
  { id: "three", label: "3 columns (4+4+4)", icon: "▦", spans: [4, 4, 4] },
  { id: "logo-center-nav", label: "Logo Center + Nav (2+8+2)", icon: "▥", spans: [2, 8, 2] },
  { id: "footer-four", label: "4 columns (3+3+3+3)", icon: "▦", spans: [3, 3, 3, 3] },
];

/** Pick a subset of ROW_LAYOUTS by id, preserving one shared definition. */
export function pickRowLayouts(ids: readonly string[]): RowLayout[] {
  return ROW_LAYOUTS.filter((l) => ids.includes(l.id));
}

function freshColumn(span: number): ColumnData {
  return { id: crypto.randomUUID(), span, blocks: [] };
}

/** Build a row block from a prebuilt layout preset. "row" yields a single column. */
export function createRowLayout(layoutId: string): RowBlock {
  if (layoutId === LAYOUT_ROW_ID) return createSingleColumnRow();
  const layout = ROW_LAYOUTS.find((l) => l.id === layoutId);
  const spans = layout?.spans ?? [6, 6];
  return {
    id: crypto.randomUUID(),
    type: "row",
    props: {
      columns: spans.map(freshColumn),
      gap: 24,
      align: "stretch",
      stackOnMobile: true,
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingY: 10,
      width: "full",
      fullWidth: true,
    },
  };
}

/** Layout palette item ids. */
export const LAYOUT_CONTAINER_ID = "container";
export const LAYOUT_ROW_ID = "row";

/** Full-width section container used by the "container" layout palette item. */
export function createSectionBlock(): SectionBlock {
  return {
    id: crypto.randomUUID(),
    type: "section",
    props: {
      rows: [],
      width: "full",
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 10,
      paddingBottom: 10,
    },
  };
}

/** Single full-width column used by the "row" layout palette item. */
export function createSingleColumnRow(): RowBlock {
  return {
    id: crypto.randomUUID(),
    type: "row",
    props: {
      columns: [freshColumn(12)],
      gap: 24,
      align: "stretch",
      stackOnMobile: true,
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingY: 10,
      width: "full",
      fullWidth: true,
    },
  };
}

/** Build the block backing a row/container layout palette item. */
export function createLayoutBlock(layoutId: string): Block {
  if (layoutId === LAYOUT_CONTAINER_ID) return createSectionBlock();
  return createRowLayout(layoutId);
}

/** Deep-copy any non-row block props (arrays are cloned so trees never share state). */
function cloneProps(type: BlockType, defaults: Block["props"]): Block["props"] {
  const src = defaults as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(src)) {
    const value = src[key];
    out[key] = Array.isArray(value)
      ? (value as unknown[]).map((item) =>
          item && typeof item === "object" ? { ...(item as object) } : item,
        )
      : value && typeof value === "object"
        ? structuredClone(value)
        : value;
  }
  return out as Block["props"];
}

export function createBlock(type: BlockType): Block {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
  if (!def) throw new Error(`Unknown block type: ${type}`);

  if (type === "row") {
    return {
      id: crypto.randomUUID(),
      type: "row",
      props: {
        columns: [freshColumn(6), freshColumn(6)],
        gap: 24,
        align: "stretch",
        stackOnMobile: true,
        bgColor: undefined,
        bgImage: "",
        textColor: undefined,
        paddingY: 10,
        fullWidth: false,
      },
    } as Block;
  }

  if (type === "section") {
    return {
      id: crypto.randomUUID(),
      type: "section",
      props: {
        rows: [],
        bgColor: undefined,
        bgImage: "",
        textColor: undefined,
        paddingTop: 10,
        paddingBottom: 10,
      },
    } as Block;
  }

  return {
    id: crypto.randomUUID(),
    type,
    props: cloneProps(type, def.defaults),
  } as Block;
}