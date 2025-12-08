import { SearchFilters, ModelResult } from "../types/models";
import {
  filterBySize,
  getParamsValue,
  getSizeBounds,
  matchesTask,
} from "./modelUtils";

const DEFAULT_SEMANTIC_API_URL = "https://davanstrien-huggingface-datasets-search-v2.hf.space";
const SEMANTIC_API_URL =
  (
    import.meta.env.VITE_SEMANTIC_SEARCH_BASE_URL as string | undefined
  )?.replace(/\/$/, "") || DEFAULT_SEMANTIC_API_URL;

interface SemanticSearchResponse {
  results?: Array<{
    model_id: string;
    summary?: string;
    similarity?: number;
    likes?: number;
    downloads?: number;
    param_count?: number | null;
    pipeline_tag?: string;
    library?: string;
    license?: string;
  }>;
}

export async function searchModelsSemantic(
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const sizeBounds = getSizeBounds(filters.size);
  const params = new URLSearchParams({
    query: trimmedQuery,
    k: "10",
    sort_by: "similarity",
    min_likes: "0",
    min_downloads: "0",
  });

  if (sizeBounds.min_param_count !== undefined) {
    params.set("min_param_count", sizeBounds.min_param_count.toString());
  }
  if (sizeBounds.max_param_count !== undefined) {
    params.set("max_param_count", sizeBounds.max_param_count.toString());
  }

  const response = await fetch(`${SEMANTIC_API_URL}/search/models?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Semantic search failed: ${response.status} ${response.statusText}`);
  }

  const data: SemanticSearchResponse = await response.json();

  if (!data.results) {
    return [];
  }

  return data.results
    .map((item) => {
      const totalParams = getParamsValue(item.param_count ?? undefined);

      return {
        id: item.model_id,
        description: item.summary,
        task: item.pipeline_tag,
        params: totalParams,
        framework: item.library,
        downloads: item.downloads,
        likes: item.likes,
        license: item.license,
        similarity: item.similarity,
        provider: "semantic" as const,
        url: `https://huggingface.co/${item.model_id}`,
      };
    })
    .filter(
      (model) =>
        filterBySize(model.params, filters.size) &&
        matchesTask({ pipelineTag: model.task }, filters.task)
    );
}
