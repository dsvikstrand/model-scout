import argparse
import json
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from sentence_transformers import SentenceTransformer
from tqdm import tqdm


def load_catalog(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def flatten_queries(catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows = []
    for model in catalog:
        model_id = model.get("id")
        meta_text = " ".join([
            model.get("name", ""),
            " ".join(model.get("task", []) or []),
            model.get("params", ""),
            model.get("license", ""),
            " ".join(model.get("framework", []) or []),
        ]).strip()
        qbl = (model.get("queries_by_level") or {})
        for level in ("expert", "junior", "beginner"):
            for q in qbl.get(level, []) or []:
                # Concatenate metadata to the query for richer context
                text = f"{q} | {meta_text}" if meta_text else q
                rows.append({
                    "model_id": model_id,
                    "level": level,
                    "query": q,
                    "text_for_embedding": text,
                })
    return rows


def embed_texts(model_name: str, texts: List[str], batch_size: int = 32) -> np.ndarray:
    model = SentenceTransformer(model_name)
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype("float32")
    return embeddings


def main():
    input= Path("models_catalog.json")
    output_p=Path("catalog_embeddings.json")
    model="BAAI/bge-small-en-v1.5"
    batch_size=32

    catalog = load_catalog(input)
    rows = flatten_queries(catalog)
    if not rows:
        raise SystemExit("No queries found in catalog")

    texts = [r["text_for_embedding"] for r in rows]
    print(f"Embedding {len(texts)} texts with {model}...")
    embeddings = embed_texts(model, texts, batch_size=batch_size)

    # Build output payload: embeddings as lists for JSON portability
    output = []
    for row, emb in zip(rows, embeddings):
        output.append({
          "model_id": row["model_id"],
          "level": row["level"],
          "query": row["query"],
          "embedding": emb.tolist(),  # float32, L2-normalized
        })


    with output_p.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(output)} embeddings to {output_p.resolve()}")


