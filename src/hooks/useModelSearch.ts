import { useQuery } from "@tanstack/react-query";
import { SearchMode, SearchFilters, ModelResult } from "../types/models";
import { searchModels } from "../services/searchProvider";

interface UseModelSearchOptions {
  mode: SearchMode;
  query: string;
  filters: SearchFilters;
}

export function useModelSearch({ mode, query, filters }: UseModelSearchOptions) {
  return useQuery<ModelResult[], Error>({
    queryKey: ["models", mode, query, filters],
    queryFn: () => searchModels(mode, query, filters),
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
