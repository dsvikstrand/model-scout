import { useQuery } from "@tanstack/react-query";
import { SearchMode, SearchFilters, ModelResult } from "../types/models";
import { searchModels } from "../services/searchProvider";

interface UseModelSearchOptions {
  mode: SearchMode;
  query: string;
  filters: SearchFilters;
  topK?: number;
}

export function useModelSearch({ mode, query, filters, topK = 10 }: UseModelSearchOptions) {
  return useQuery<ModelResult[], Error>({
    queryKey: ["models", mode, query, filters, topK],
    queryFn: () => searchModels(mode, query, filters, { topK }),
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
