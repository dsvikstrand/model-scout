import { SearchMode, SearchFilters, ModelResult } from "../types/models";
import { searchModelsSemantic } from "./semanticSearchProvider";
import { searchModelsKeyword } from "./hubKeywordProvider";

export async function searchModels(
  mode: SearchMode,
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  if (mode === "semantic") {
    return searchModelsSemantic(trimmedQuery, filters);
  }
  return searchModelsKeyword(trimmedQuery, filters);
}
