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
  downloads?: number;
  likes?: number;
}

let clientPromise: Promise<any> | null = null;
let catalogPromise: Promise<Record<string, { params?: string; license?: string }>> | null = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = import("@gradio/client").then(({ Client }) => Client.connect(SEMANTIC_API_URL));
  }
  return clientPromise;
}

async function getCatalog(): Promise<Record<string, { params?: string; license?: string }>> {
  if (!catalogPromise) {
    const url = `${import.meta.env.BASE_URL}models_catalog.json`;
    catalogPromise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load catalog: ${res.status}`);
        return res.json();
      })
      .then((items: Array<{ id: string; params?: string; license?: string }>) =>
        items.reduce<Record<string, { params?: string; license?: string }>>((acc, item) => {
          if (item.id) acc[item.id] = { params: item.params, license: item.license };
          return acc;
        }, {})
      )
      .catch(() => ({}));
  }
  return catalogPromise;
}

export async function searchModelsSemantic(
  query: string,
  filters: SearchFilters,
  options?: { topK?: number }
): Promise<ModelResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const topK = options?.topK ?? 10;

  const [client, catalog] = await Promise.all([getClient(), getCatalog()]);
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

      const catalogEntry = catalog[item.model_id];

      const paramsValue =
        parseParamsCount(catalogEntry?.params) ||
        (typeof item.params === "number"
          ? getParamsValue(item.params)
          : typeof item.params === "string"
            ? parseParamsCount(item.params)
            : undefined);

      const model: ModelResult = {
        id: item.model_id,
        description: item.name,
        task: primaryTask,
        params: paramsValue,
        framework: undefined,
        downloads: item.downloads,
        likes: item.likes,
        license: catalogEntry?.license || item.license,
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
