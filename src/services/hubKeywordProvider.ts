import { SearchFilters, ModelResult, TASK_PIPELINE_TAGS } from "../types/models";
import { extractLicense, filterBySize, getParamsValue, matchesTask } from "./modelUtils";

const DEFAULT_HF_API_BASE_URL = "https://huggingface.co/api";
const HF_HUB_API_BASE_URL =
  (
    import.meta.env.VITE_HF_HUB_API_BASE_URL as string | undefined
  )?.replace(/\/$/, "") || DEFAULT_HF_API_BASE_URL;
const HF_HUB_API_URL = `${HF_HUB_API_BASE_URL}/models`;
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN as string | undefined;

interface HubModel {
  id: string;
  modelId?: string;
  author?: string;
  sha?: string;
  lastModified?: string;
  private?: boolean;
  gated?: boolean | string;
  disabled?: boolean;
  downloads?: number;
  likes?: number;
  library_name?: string;
  tags?: string[];
  pipeline_tag?: string;
  safetensors?: {
    total?: number;
    parameters?: Record<string, number>;
  };
  cardData?: {
    license?: string;
    description?: string;
  };
}

export async function searchModelsKeyword(
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const params = new URLSearchParams({
    search: trimmedQuery,
    limit: "50",
    sort: "downloads",
    direction: "-1",
  });

  if (filters.task && TASK_PIPELINE_TAGS[filters.task]) {
    params.append("pipeline_tag", TASK_PIPELINE_TAGS[filters.task][0]);
  }

  const response = await fetch(`${HF_HUB_API_URL}?${params.toString()}`, {
    headers: HF_TOKEN
      ? {
          Authorization: `Bearer ${HF_TOKEN}`,
        }
      : undefined,
  });

  if (!response.ok) {
    throw new Error(`HF Hub search failed: ${response.status} ${response.statusText}`);
  }

  const data: HubModel[] = await response.json();

  return data
    .map((model) => {
      const totalParams = getParamsValue(model.safetensors?.total, model.safetensors?.parameters);
      const license = extractLicense(model.tags, model.cardData?.license);

      return {
        result: {
          id: model.id,
          description: model.cardData?.description,
          task: model.pipeline_tag,
          params: totalParams,
          framework: model.library_name,
          downloads: model.downloads,
          likes: model.likes,
          license,
          provider: "keyword" as const,
          url: `https://huggingface.co/${model.id}`,
        },
        tags: model.tags,
      };
    })
    .filter(
      ({ result, tags }) =>
        filterBySize(result.params, filters.size) &&
        matchesTask({ pipelineTag: result.task, tags }, filters.task)
    )
    .map(({ result }) => result);
}
