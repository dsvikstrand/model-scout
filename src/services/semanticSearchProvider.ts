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

let clientPromise: Promise<any> | null = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = import("@gradio/client").then(({ Client }) => Client.connect(SEMANTIC_API_URL));
  }
  return clientPromise;
}

export async function searchModelsSemantic(
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const topK = 10;

  const client = await getClient();
  let result: any;

  try {
    result = await client.predict("/semantic_search", {
      query: trimmedQuery,
      top_k: topK,
    });
  } catch (error: any) {
    const message = error?.message || "Semantic search failed";
    throw new Error(`Semantic search failed: ${message}`);
  }

  const items: SpaceResultItem[] = (result?.data?.[0] as SpaceResultItem[]) ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results: ModelResult[] = items
    .map((item) => {
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
