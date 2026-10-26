import type { TurfSortField, SortOrder } from "./api";

export const SORT_OPTIONS: {
  label: string;
  sortBy: TurfSortField;
  sortOrder: SortOrder;
}[] = [
  { label: "Newest", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Price: Low → High", sortBy: "defaultSlotPrice", sortOrder: "asc" },
  { label: "Price: High → Low", sortBy: "defaultSlotPrice", sortOrder: "desc" },
  { label: "Name: A → Z", sortBy: "name", sortOrder: "asc" },
  { label: "Name: Z → A", sortBy: "name", sortOrder: "desc" },
];

export const DEFAULT_SORT = SORT_OPTIONS[0];

export interface Filters {
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  sortBy: TurfSortField;
  sortOrder: SortOrder;
}

export const DEFAULT_FILTERS: Filters = {
  categoryId: "",
  minPrice: "",
  maxPrice: "",
  sortBy: DEFAULT_SORT.sortBy,
  sortOrder: DEFAULT_SORT.sortOrder,
};

export const activeFilterCount = (f: Filters) =>
  (f.categoryId ? 1 : 0) + (f.minPrice.trim() ? 1 : 0) + (f.maxPrice.trim() ? 1 : 0);

/** True when any filter differs from the defaults. */
export const hasNonDefaultFilters = (f: Filters) =>
  activeFilterCount(f) > 0 ||
  f.sortBy !== DEFAULT_SORT.sortBy ||
  f.sortOrder !== DEFAULT_SORT.sortOrder;

/** Accepts digits and a single trailing dot so "500." still parses. */
export const sanitizeAmount = (v: string) => {
  const cleaned = v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  return cleaned.slice(0, 7);
};

/** Blank / "." is treated as "no bound". */
export const toAmount = (v: string): number | undefined => {
  const t = v.trim();
  if (!t || t === ".") return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** True when both bounds are set and min exceeds max. */
export const isPriceRangeInverted = (min: string, max: string) => {
  const lo = toAmount(min);
  const hi = toAmount(max);
  return lo !== undefined && hi !== undefined && lo > hi;
};
