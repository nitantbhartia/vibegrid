"use client";

import useSWR from "swr";
import type { GridState } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useGridData() {
  const { data, error, isLoading, mutate } = useSWR<GridState>(
    "/api/grid",
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
    }
  );

  return {
    gridState: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
