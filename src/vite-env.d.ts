/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SEMANTIC_SEARCH_BASE_URL?: string;
  readonly VITE_HF_HUB_API_BASE_URL?: string;
  readonly VITE_HF_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
