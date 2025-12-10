import json
import os
from pathlib import Path
from typing import Any, Dict, List

import gradio as gr
import numpy as np
from sentence_transformers import SentenceTransformer

CATALOG_PATH = Path("models_catalog.json")
MODEL_ID = "BAAI/bge-small-en-v1.5"
MIN_SIM = float(os.getenv("MIN_SIM", "0.2"))


def load_catalog(path: Path) -> List[Dict[str, Any]]:
  with path.open("r", encoding="utf-8") as f:
    return json.load(f)


def flatten_queries(catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  """Flatten queries_by_level into a list of (model_id, level, query)."""
  rows: List[Dict[str, Any]] = []
  for model in catalog:
    model_id = model.get("id")
    queries_by_level = model.get("queries_by_level") or {}
    for level in ("expert", "junior", "beginner"):
      for q in (queries_by_level.get(level) or []):
        q = (q or "").strip()
        if not q:
          continue
        rows.append(
          {
            "model_id": model_id,
            "level": level,
            "query": q,
          }
        )
  return rows


# ---- Startup: load model, catalog, and build index ----

print("Loading embedding model...")
embedder = SentenceTransformer(MODEL_ID)

if not CATALOG_PATH.exists():
  raise RuntimeError(f"Catalog file not found: {CATALOG_PATH}")

print("Loading catalog...")
catalog = load_catalog(CATALOG_PATH)
models_by_id: Dict[str, Dict[str, Any]] = {m["id"]: m for m in catalog}

print("Flattening synthetic queries...")
rows = flatten_queries(catalog)
if not rows:
  raise RuntimeError("No queries found in catalog; nothing to index.")

texts = [r["query"] for r in rows]
print(f"Embedding {len(texts)} synthetic queries...")
# BGE docs recommend normalize_embeddings=True for cosine / dot similarity
embeddings = embedder.encode(
  texts,
  normalize_embeddings=True,
  convert_to_numpy=True,
).astype(np.float32)

QUERY_EMBEDDINGS = embeddings  # [N, D]
QUERY_META = rows
MODELS_BY_ID = models_by_id

print(f"Index built: embeddings shape = {QUERY_EMBEDDINGS.shape}")


# ---- Semantic search function ----

def semantic_search(query: str, top_k: int = 10) -> List[Dict[str, Any]]:
  query = (query or "").strip()
  if not query:
    return []

  # Encode and normalize query
  q_vec = embedder.encode(
    [query],
    normalize_embeddings=True,
    convert_to_numpy=True,
  )[0].astype(np.float32)

  # Cosine similarity via dot product (since both sides normalized)
  sims = QUERY_EMBEDDINGS @ q_vec  # [N]

  # Aggregate per model_id: max similarity per model
  scores: Dict[str, float] = {}
  best_query: Dict[str, str] = {}

  for idx, meta in enumerate(QUERY_META):
    model_id = meta["model_id"]
    s = float(sims[idx])
    if model_id not in scores or s > scores[model_id]:
      scores[model_id] = s
      best_query[model_id] = meta["query"]

  ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)

  results: List[Dict[str, Any]] = []
  for model_id, score in ranked:
    if score < MIN_SIM:
      continue
    m = MODELS_BY_ID.get(model_id, {})
    tasks = m.get("task", [])
    tasks_str = ", ".join(tasks) if isinstance(tasks, list) else str(tasks)

    results.append(
      {
        "model_id": model_id,
        "name": m.get("name", ""),
        "tasks": tasks,
        "tasks_str": tasks_str,
        "params": m.get("params", ""),
        "license": m.get("license", ""),
        "url": m.get("url", ""),
        "score": round(score, 4),
        "via": best_query.get(model_id, ""),
      }
    )
    if len(results) >= top_k:
      break

  return results


# ---- Gradio interface ----

demo = gr.Interface(
  fn=semantic_search,
  inputs=[
    gr.Textbox(
      lines=3,
      label="Describe the model you need",
      placeholder="e.g. Small ViT for 224x224 classification on a single GPU, Apache-2.0...",
    ),
    gr.Slider(1, 30, value=10, step=1, label="Top K models"),
  ],
  outputs=gr.JSON(label="Results (per model)"),
  title="Model Scout – Semantic Search Backend",
  description="Semantic search over a curated catalog of ML models using BGE-small.",
)


if __name__ == "__main__":
  demo.launch()
