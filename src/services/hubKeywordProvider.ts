import { SearchFilters, ModelResult, TASK_PIPELINE_TAGS, SIZE_RANGES } from "../types/models";

const HF_HUB_API_URL = "https://huggingface.co/api/models";

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
  };
}

function filterBySize(params: number | undefined, sizeFilter: SearchFilters["size"]): boolean {
  if (!sizeFilter || params === undefined) return true;
  
  const range = SIZE_RANGES[sizeFilter];
  if (range.min !== undefined && params < range.min) return false;
  if (range.max !== undefined && params >= range.max) return false;
  return true;
}

export async function searchModelsKeyword(
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const params = new URLSearchParams({
    search: query,
    limit: "50",
    sort: "downloads",
    direction: "-1",
  });

  // Add pipeline_tag filter if task is specified
  if (filters.task && TASK_PIPELINE_TAGS[filters.task]) {
    // Use the first pipeline tag for the task category
    params.append("pipeline_tag", TASK_PIPELINE_TAGS[filters.task][0]);
  }

  const response = await fetch(`${HF_HUB_API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`HF Hub search failed: ${response.status}`);
  }

  const data: HubModel[] = await response.json();

  return data
    .map((model) => {
      const totalParams = model.safetensors?.total;
      
      return {
        id: model.id,
        description: undefined, // Hub API doesn't return descriptions in list
        task: model.pipeline_tag,
        params: totalParams,
        framework: model.library_name,
        downloads: model.downloads,
        likes: model.likes,
        license: model.cardData?.license,
        url: `https://huggingface.co/${model.id}`,
      };
    })
    .filter((model) => filterBySize(model.params, filters.size));
}
