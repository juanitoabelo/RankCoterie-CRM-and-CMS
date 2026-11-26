/**
 * Tokens understood by renderLocalizedContent() and used by GeoCategory
 * intro/content fields. Matching is case-insensitive.
 */
export const GEO_CATEGORY_TOKENS: Array<{ token: string; example: string; note?: string }> = [
  { token: "{{region}}", example: "San Diego, CA / California" },
  { token: "{{in region}}", example: "in San Diego, CA / in California" },
  { token: "{{around region}}", example: "around San Diego, CA" },
  { token: "{{near region}}", example: "near San Diego, CA" },
  { token: "{{of region}}", example: "of San Diego, CA" },
  { token: "{{from region}}", example: "from San Diego, CA" },
  { token: "{{in the region area}}", example: "in the San Diego, CA area" },
  { token: "{{from the region area}}", example: "from the San Diego, CA area" },
  { token: "{{regionurlpart}}", example: "San-Diego-California-CA", note: "Region URL slug" },
  { token: "{{region2inject}}", example: "Region custom content block", note: "Only where region Custom2 is populated" },
  { token: "{{catName}}", example: "Category name", note: "Template/listing contexts; may be empty on /g/ pages" },
  { token: "{{in catName}}", example: "in Category name", note: "Template/listing contexts; may be empty on /g/ pages" },
  { token: "{{subcat}}", example: "Subcategory name", note: "Template/listing contexts; may be empty on /g/ pages" },
  { token: "{{subcattext}}", example: "Subcategory display text", note: "Template/listing contexts; may be empty on /g/ pages" },
];

/** Data-binding tokens available in listing content fields (form help + template builder). */
export const CONTENT_TOKENS: Array<{ token: string; example: string }> = [
  { token: "{{region}}", example: "Miami, FL" },
  { token: "{{in region}}", example: "in Miami, FL" },
  { token: "{{around region}}", example: "around Miami, FL" },
  { token: "{{near region}}", example: "near Miami, FL" },
  { token: "{{of region}}", example: "of Miami, FL" },
  { token: "{{from region}}", example: "from Miami, FL" },
  { token: "{{in the region area}}", example: "in the Miami, FL area" },
  { token: "{{from the region area}}", example: "from the Miami, FL area" },
  { token: "{{regionurlpart}}", example: "region URL slug" },
  { token: "{{region2inject}}", example: "region's custom content block" },
  { token: "{{catName}}", example: "Residential Treatment Centers" },
  { token: "{{in catName}}", example: "in Residential Treatment Centers" },
  { token: "{{subcat}}", example: "subcategory name" },
  { token: "{{subcattext}}", example: "subcategory display text" },
  { token: "{{title}}", example: "listing title" },
  { token: "{{companyName}}", example: "company name" },
  { token: "{{city}}", example: "city" },
  { token: "{{state}}", example: "state" },
  { token: "{{phone}}", example: "phone number" },
  { token: "{{email}}", example: "email address" },
  { token: "{{website}}", example: "website URL" },
  { token: "{{rating}}", example: "average rating" },
  { token: "{{reviewCount}}", example: "review count" },
];
