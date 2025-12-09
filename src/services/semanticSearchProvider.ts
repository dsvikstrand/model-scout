import { SearchFilters, ModelResult } from "../types/models";
import { filterBySize, getParamsValue, matchesTask, parseParamsCount } from "./modelUtils";

const DEFAULT_SEMANTIC_API_URL = "https://v1kstrand-model-scout-semantic.hf.space";
const DEFAULT_HF_API_BASE_URL = "https://huggingface.co/api";

const SEMANTIC_API_URL =
  (import.meta.env.VITE_SEMANTIC_SEARCH_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  DEFAULT_SEMANTIC_API_URL;
const HF_HUB_API_BASE_URL =
  (import.meta.env.VITE_HF_HUB_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  DEFAULT_HF_API_BASE_URL;
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;

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
const statsCache = new Map<string, { downloads?: number; likes?: number; license?: string }>();

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

async function fetchModelStats(modelId: string): Promise<{ downloads?: number; likes?: number; license?: string }> {
  if (statsCache.has(modelId)) {
    return statsCache.get(modelId) || {};
  }

  try {
    const response = await fetch(`${HF_HUB_API_BASE_URL}/models/${modelId}`, {
      headers: HF_TOKEN
        ? {
            Authorization: `Bearer ${HF_TOKEN}`,
          }
        : undefined,
    });

    if (!response.ok) {
      statsCache.set(modelId, {});
      return {};
    }

    const data = await response.json();
    const stats = {
      downloads: data.downloads as number | undefined,
      likes: data.likes as number | undefined,
      license: data.cardData?.license as string | undefined,
    };
    statsCache.set(modelId, stats);
    return stats;
  } catch (error) {
    statsCache.set(modelId, {});
    return {};
  }
}

function isSpaceWakingError(error: any): boolean {
  const msg = (error?.message || "").toLowerCase();
  return (
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("network")
  );
}

async function warmUpSpace() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`${SEMANTIC_API_URL}/gradio_api/info`, { signal: controller.signal });
  } catch {
    // ignore; warming attempt only
  } finally {
    clearTimeout(timeout);
  }
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

  const callPredict = async () =>
    client.predict("/semantic_search", {
      query: trimmedQuery,
      top_k: topK,
    });

  try {
    result = await callPredict();
  } catch (error: any) {
    if (isSpaceWakingError(error)) {
      await warmUpSpace();
      try {
        result = await callPredict();
      } catch (err: any) {
        throw new Error(
          "Semantic backend is waking up. Please wait ~1 minute and try again, or switch to Keyword mode."
        );
      }
    } else {
      const message = error?.message || "Semantic search failed";
      throw new Error(`Semantic search failed: ${message}`);
    }
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

  // Enrich missing stats from HF Hub if needed
  const toEnrich = results.filter((r) => r.downloads == null && r.likes == null);
  if (toEnrich.length > 0) {
    const statsList = await Promise.all(toEnrich.map((r) => fetchModelStats(r.id)));
    toEnrich.forEach((model, idx) => {
      const stats = statsList[idx];
      if (stats.downloads !== undefined) model.downloads = stats.downloads;
      if (stats.likes !== undefined) model.likes = stats.likes;
      if (!model.license && stats.license) model.license = stats.license;
    });
  }

  return results;
}
