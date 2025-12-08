import { SearchFilters, ModelResult } from "../types/models";
import { filterBySize, matchesTask, parseParamsCount } from "./modelUtils";

type EmbeddingRecord = {
  model_id: string;
  level: string;
  query: string;
  embedding: number[];
};

type CatalogModel = {
  id: string;
  name?: string;
  task?: string[];
  params?: string;
  license?: string;
  framework?: string[];
  url?: string;
};

const HF_EMBED_ENDPOINT =
  import.meta.env.VITE_SEMANTIC_SEARCH_BASE_URL?.replace(/\/$/, "") ||
  "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5/pipeline/feature-extraction";

const EMBEDDINGS_URL = `${import.meta.env.BASE_URL}catalog_embeddings.json`;
const CATALOG_URL = `${import.meta.env.BASE_URL}models_catalog.json`;

let cachedEmbeddings: Float32Array[] | null = null;
let cachedMeta: EmbeddingRecord[] | null = null;
let cachedCatalog: Record<string, CatalogModel> | null = null;

async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function ensureDataLoaded() {
  if (cachedEmbeddings && cachedMeta && cachedCatalog) return;

  const [embeddings, catalog] = await Promise.all([
    loadJson<EmbeddingRecord[]>(EMBEDDINGS_URL),
    loadJson<CatalogModel[]>(CATALOG_URL),
  ]);

  cachedEmbeddings = embeddings.map((r) => Float32Array.from(r.embedding));
  cachedMeta = embeddings;
  cachedCatalog = catalog.reduce<Record<string, CatalogModel>>((acc, model) => {
    if (model.id) acc[model.id] = model;
    return acc;
  }, {});
}

async function embedQuery(text: string): Promise<Float32Array> {
  const token = import.meta.env.VITE_HF_TOKEN;
  if (!token) {
    throw new Error("Set VITE_HF_TOKEN to enable semantic embeddings.");
  }
  const res = await fetch(HF_EMBED_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ inputs: [text] }),
  });

  if (!res.ok) {
    throw new Error(`Semantic embedding failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const arr = Array.isArray(data) ? data : [];
  if (!Array.isArray(arr[0])) {
    throw new Error("Unexpected embedding response shape.");
  }

  const vec = Float32Array.from(arr[0] as number[]);
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm) || 1e-12;
  for (let i = 0; i < vec.length; i++) {
    vec[i] = vec[i] / norm;
  }
  return vec;
}

function dot(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export async function searchModelsSemantic(
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  await ensureDataLoaded();
  if (!cachedEmbeddings || !cachedMeta || !cachedCatalog) {
    throw new Error("Semantic index not available.");
  }

  const qVec = await embedQuery(trimmedQuery);

  const scores = new Map<string, { score: number; via: string }>();

  for (let i = 0; i < cachedEmbeddings.length; i++) {
    const meta = cachedMeta[i];
    const sim = dot(cachedEmbeddings[i], qVec);
    const current = scores.get(meta.model_id);
    if (!current || sim > current.score) {
      scores.set(meta.model_id, { score: sim, via: meta.query });
    }
  }

  const results: ModelResult[] = [];
  for (const [modelId, { score, via }] of scores.entries()) {
    const model = cachedCatalog[modelId];
    const tasks = model?.task;
    const taskMatch =
      !filters.task ||
      matchesTask(
        { pipelineTag: Array.isArray(tasks) ? tasks.join(",") : tasks, tags: tasks },
        filters.task
      );

    if (!taskMatch) continue;

    results.push({
      id: modelId,
      description: model?.name,
      task: Array.isArray(tasks) ? tasks.join(", ") : tasks,
      params: parseParamsCount(model?.params),
      framework: Array.isArray(model?.framework) ? model?.framework?.join(", ") : model?.framework?.[0],
      downloads: undefined,
      likes: undefined,
      license: model?.license,
      url: model?.url || `https://huggingface.co/${modelId}`,
      similarity: score,
      provider: "semantic",
      matchedQuery: via,
    });
  }

  const filtered = results
    .filter((model) => filterBySize(model.params, filters.size))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, 20);

  return filtered;
}
