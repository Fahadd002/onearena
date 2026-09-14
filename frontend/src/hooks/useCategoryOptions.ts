"use client";

import { useEffect, useState } from "react";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import type { DropdownOption } from "@/types/dropdown";

export type CategoryOption = DropdownOption;

export function useCategoryOptions() {
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    httpClient
      .get<CategoryOption[]>(API_ENDPOINTS.marketplace.categoryDropdown)
      .then((result) => {
        if (cancelled) return;
        const payload = result.data as unknown;
        const options = Array.isArray(payload)
          ? payload
          : payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)
            ? payload.data
            : [];
        setOptions(options as CategoryOption[]);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading };
}
