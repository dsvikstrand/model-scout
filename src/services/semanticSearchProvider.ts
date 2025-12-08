import { SearchFilters, ModelResult } from "../types/models";
import { filterBySize, getParamsValue, matchesTask } from "./modelUtils";

const DEFAULT_SEMANTIC_API_URL = "https://davanstrien-huggingface-datasets-search-v2.hf.space";
const SEMANTIC_API_URL =
  (
    import.meta.env.VITE_SEMANTIC_SEARCH_BASE_URL as string | undefined
  )?.replace(/\/$/, "") || DEFAULT_SEMANTIC_API_URL;

interface SemanticSearchResponse {
  results?: Array<{
    id: string;
    summary?: string;
    description?: string;
    pipeline_tag?: string;
    safetensors?: {
      total?: number;
      parameters?: Record<string, number>;
    };
    library_name?: string;
    downloads?: number;
    likes?: number;
    license?: string;
  }>;
}

export async function searchModelsSemantic(
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const response = await fetch(`${SEMANTIC_API_URL}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: trimmedQuery,
      limit: 50,
      type: "model",
    }),
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
      const totalParams = getParamsValue(item.safetensors?.total, item.safetensors?.parameters);

      return {
        id: item.id,
        description: item.summary || item.description,
        task: item.pipeline_tag,
        params: totalParams,
        framework: item.library_name,
        downloads: item.downloads,
        likes: item.likes,
        license: item.license,
        url: `https://huggingface.co/${item.id}`,
      };
    })
    .filter(
      (model) =>
        filterBySize(model.params, filters.size) &&
        matchesTask({ pipelineTag: model.task }, filters.task)
    );
}
