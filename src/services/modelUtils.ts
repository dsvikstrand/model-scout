import { SearchFilters, SIZE_RANGES } from "../types/models";

export const TASK_KEYWORDS: Record<Exclude<SearchFilters["task"], undefined>, string[]> = {
  text: ["text", "generation", "classification", "translation", "question-answering", "summarization", "fill-mask"],
  vision: ["image", "vision", "object-detection", "segmentation", "image-to-image", "depth"],
  audio: ["audio", "speech", "text-to-speech", "automatic-speech-recognition"],
  multimodal: ["multimodal", "image-to-text", "text-to-image", "video", "vision-language", "visual-question-answering"],
  other: [],
};

const KNOWN_TASK_KEYWORDS = Array.from(new Set(Object.values(TASK_KEYWORDS).flat().filter(Boolean)));

export function getParamsValue(total?: number, parameterMap?: Record<string, number>): number | undefined {
  if (typeof total === "number") return total;
  if (!parameterMap) return undefined;

  const values = Object.values(parameterMap).filter((value): value is number => typeof value === "number");
  if (values.length === 0) return undefined;

  return Math.max(...values);
}

export function filterBySize(params: number | undefined, sizeFilter: SearchFilters["size"]): boolean {
  if (!sizeFilter || params === undefined) return true;

  const range = SIZE_RANGES[sizeFilter];
  if (range.min !== undefined && params < range.min) return false;
  if (range.max !== undefined && params >= range.max) return false;
  return true;
}

export function matchesTask(
  { pipelineTag, tags }: { pipelineTag?: string; tags?: string[] },
  taskFilter: SearchFilters["task"]
): boolean {
  if (!taskFilter) return true;

  const normalized = [pipelineTag, ...(tags || [])]
    .filter(Boolean)
    .map((tag) => tag!.toLowerCase());

  if (taskFilter === "other") {
    return normalized.length === 0 || !normalized.some((tag) => KNOWN_TASK_KEYWORDS.some((keyword) => tag.includes(keyword)));
  }

  const keywords = TASK_KEYWORDS[taskFilter];
  if (!keywords || keywords.length === 0) return true;

  return normalized.some((tag) => keywords.some((keyword) => tag.includes(keyword)));
}

export function extractLicense(tags?: string[], license?: string): string | undefined {
  if (license) return license;
  const licenseTag = tags?.find((tag) => tag.startsWith("license:"));
  return licenseTag ? licenseTag.replace("license:", "") : undefined;
}

export function parseParamsCount(params?: string): number | undefined {
  if (!params) return undefined;
  const match = params.trim().match(/^([\d.]+)\s*([kKmMbB])?$/);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();
  if (Number.isNaN(value)) return undefined;
  if (unit === "k") return value * 1_000;
  if (unit === "m") return value * 1_000_000;
  if (unit === "b") return value * 1_000_000_000;
  return value;
}

export function getSizeBounds(size?: SearchFilters["size"]): {
  min_param_count?: number;
  max_param_count?: number;
} {
  if (!size) return {};
  const range = SIZE_RANGES[size];
  return {
    min_param_count: range.min,
    max_param_count: range.max,
  };
}

export function getSizeBucketFromParams(params?: number): SearchFilters["size"] | undefined {
  if (params === undefined) return undefined;
  if (params < (SIZE_RANGES.small.max ?? Infinity)) return "small";
  if (params >= (SIZE_RANGES.large.min ?? Number.MAX_SAFE_INTEGER)) return "large";
  return "medium";
}
