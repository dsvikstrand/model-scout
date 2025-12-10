export type SearchMode = "semantic" | "keyword";

export interface SearchFilters {
  task?: "text" | "vision" | "audio" | "multimodal" | "embedding" | "other";
  size?: "small" | "medium" | "large";
  minDownloads?: number;
  minLikes?: number;
}

export interface ModelResult {
  id: string;
  description?: string;
  task?: string;
  params?: number;
  framework?: string;
  downloads?: number;
  likes?: number;
  license?: string;
  url: string;
  similarity?: number;
  provider?: "semantic" | "keyword";
   matchedQuery?: string;
}

// Task to pipeline_tag mappings for HF Hub API
export const TASK_PIPELINE_TAGS: Record<string, string[]> = {
  text: ["text-generation", "text-classification", "token-classification", "question-answering", "summarization", "translation", "fill-mask", "text2text-generation"],
  vision: ["image-classification", "object-detection", "image-segmentation", "image-to-image", "depth-estimation"],
  audio: ["automatic-speech-recognition", "audio-classification", "text-to-speech", "audio-to-audio"],
  multimodal: ["image-to-text", "text-to-image", "visual-question-answering", "document-question-answering", "video-classification"],
  embedding: ["sentence-similarity", "text-embedding"],
  other: ["reinforcement-learning", "tabular-classification", "tabular-regression", "feature-extraction"],
};

// Size ranges in billions of parameters
export const SIZE_RANGES: Record<string, { min?: number; max?: number }> = {
  small: { max: 1_000_000_000 },
  medium: { min: 1_000_000_000, max: 10_000_000_000 },
  large: { min: 10_000_000_000 },
};
