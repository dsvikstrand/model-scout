import { SearchFilters, ModelResult } from "../types/models";
import { filterBySize, getParamsValue, matchesTask, parseParamsCount } from "./modelUtils";

const DEFAULT_SEMANTIC_API_URL = "https://v1kstrand-model-scout-semantic.hf.space";

const SEMANTIC_API_URL =
  (import.meta.env.VITE_SEMANTIC_SEARCH_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  DEFAULT_SEMANTIC_API_URL;

interface SpaceResultItem {
  model_id: string;
  name?: string;
  tasks?: string[] | string;
  tasks_str?: string;
  params?: string | number | null;
  license?: string;
  url: string;
  score: number;
  via?: string;
}

interface GradioSemanticResponse {
  data: [SpaceResultItem[]]; // we only care about the first output
  // other fields (is_generating, duration, etc.) are ignored
}

export async function searchModelsSemantic(
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const topK = 10;

  const response = await fetch(`${SEMANTIC_API_URL}/semantic_search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      // Gradio expects an array of inputs matching the interface signature
      data: [trimmedQuery, topK],
    }),
  });

  if (!response.ok) {
    throw new Error(`Semantic search failed: ${response.status} ${response.statusText}`);
  }

  const payload: GradioSemanticResponse = await response.json();
  const items = payload?.data?.[0] ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results: ModelResult[] = items
    .map((item) => {
      // tasks may be an array from the backend or a prejoined string
      let primaryTask: string | undefined;
      if (Array.isArray(item.tasks) && item.tasks.length > 0) {
        primaryTask = item.tasks[0];
      } else if (item.tasks_str) {
        const parts = item.tasks_str.split(",").map((s) => s.trim());
        primaryTask = parts[0] || undefined;
      }

      let paramsValue: number | undefined;
      if (typeof item.params === "number") {
        paramsValue = getParamsValue(item.params);
      } else if (typeof item.params === "string") {
        paramsValue = parseParamsCount(item.params);
      }

      const model: ModelResult = {
        id: item.model_id,
        description: item.via || item.name,
        task: primaryTask,
        params: paramsValue,
        // For now, framework/downloads/likes are not provided by the Space
        framework: undefined,
        downloads: undefined,
        likes: undefined,
        license: item.license,
        similarity: item.score,
        provider: "semantic",
        url: item.url,
        matchedQuery: item.via,
      };

      return model;
    })
    .filter((model) => {
      return filterBySize(model.params, filters.size) && matchesTask({ pipelineTag: model.task }, filters.task);
    });

  return results;
}
