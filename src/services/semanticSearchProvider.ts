import { SearchFilters, ModelResult, SIZE_RANGES } from "../types/models";

const SEMANTIC_API_URL = "https://davanstrien-huggingface-datasets-search-v2.hf.space";

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

function filterBySize(params: number | undefined, sizeFilter: SearchFilters["size"]): boolean {
  if (!sizeFilter || params === undefined) return true;
  
  const range = SIZE_RANGES[sizeFilter];
  if (range.min !== undefined && params < range.min) return false;
  if (range.max !== undefined && params >= range.max) return false;
  return true;
}

export async function searchModelsSemantic(
  query: string,
  filters: SearchFilters
): Promise<ModelResult[]> {
  const response = await fetch(`${SEMANTIC_API_URL}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: 50,
      type: "model",
    }),
  });

  if (!response.ok) {
    throw new Error(`Semantic search failed: ${response.status}`);
  }

  const data: SemanticSearchResponse = await response.json();
  
  if (!data.results) {
    return [];
  }

  return data.results
    .map((item) => {
      const totalParams = item.safetensors?.total;
      
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
    .filter((model) => {
      // Apply size filter
      if (!filterBySize(model.params, filters.size)) return false;
      
      // Apply task filter (best-effort matching)
      if (filters.task && model.task) {
        const taskLower = model.task.toLowerCase();
        const filterTask = filters.task;
        
        if (filterTask === "text" && !taskLower.includes("text")) return false;
        if (filterTask === "vision" && !taskLower.includes("image") && !taskLower.includes("vision")) return false;
        if (filterTask === "audio" && !taskLower.includes("audio") && !taskLower.includes("speech")) return false;
        if (filterTask === "multimodal" && !taskLower.includes("to-") && !taskLower.includes("visual")) return false;
      }
      
      return true;
    });
}
