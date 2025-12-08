import { SearchMode, SearchFilters, ModelResult } from "../types/models";
import { searchModelsSemantic } from "./semanticSearchProvider";
import { searchModelsKeyword } from "./hubKeywordProvider";

export async function searchModels(
  mode: SearchMode,
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  if (mode === "semantic") {
    return searchModelsSemantic(query, filters);
  }
  return searchModelsKeyword(query, filters);
}
