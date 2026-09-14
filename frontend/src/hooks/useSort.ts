"use client";
import { useState, useCallback } from "react";

export type SortDirection = "asc" | "desc";

export type SortConfig = {
  field: string;
  direction: SortDirection;
};

export function useSort(initialField = "createdAt", initialDirection: SortDirection = "desc") {
  const [sortField, setSortField] = useState<string>(initialField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

  const getSortParams = useCallback(() => ({
    sortBy: sortField,
    sortOrder: sortDirection,
  }), [sortField, sortDirection]);

  return {
    sortField,
    sortDirection,
    handleSort,
    getSortParams,
    setSortField,
    setSortDirection,
  };
}
