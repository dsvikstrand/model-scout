import json
import os
from pathlib import Path
from typing import Dict, List, Any

import numpy as np
import requests

API_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "BAAI/bge-small-en-v1.5/pipeline/feature-extraction"
)
BATCH_SIZE = 16


def load_catalog(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def flatten_queries(catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for model in catalog:
        model_id = model.get("id")
        queries_by_level = model.get("queries_by_level") or {}
        for level in ("expert", "junior", "beginner"):
            for query in queries_by_level.get(level, []) or []:
                if not query:
                    continue
                rows.append(
                    {
                        "model_id": model_id,
                        "level": level,
                        "query": query,
                    }
                )
    return rows


def embed_batch(texts: List[str], token: str) -> np.ndarray:
    if not token:
        raise RuntimeError("HF_TOKEN is required to call the Inference API")

    headers = {
        "Authorization": f"Bearer {token}",
    }
    resp = requests.post(
        API_URL,
        headers=headers,
        json={"inputs": texts},
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(
            f"Inference API error {resp.status_code}: {resp.text}"
        )

    data = resp.json()
    # Expect shape [batch, dim]
    try:
        arr = np.array(data, dtype=np.float32)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Unexpected embedding response payload: {data}") from exc

    if arr.ndim != 2 or arr.shape[0] != len(texts):
        raise RuntimeError(
            f"Embedding batch shape mismatch: got {arr.shape}, "
            f"expected ({len(texts)}, D)"
        )

    # L2-normalize per vector
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    arr = arr / np.clip(norms, 1e-12, None)
    return arr.astype(np.float32)


def build_embeddings(rows: List[Dict[str, Any]], token: str) -> np.ndarray:
    vectors: List[np.ndarray] = []
    total_batches = (len(rows) - 1) // BATCH_SIZE + 1

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        texts = [r["query"] for r in batch]
        vecs = embed_batch(texts, token)
        vectors.append(vecs)
        print(f"Embedded batch {i // BATCH_SIZE + 1}/{total_batches}")

    return np.vstack(vectors) if vectors else np.zeros((0, 0), dtype=np.float32)


def main() -> None:
    token = hf_key
    if not token:
        raise SystemExit("HF_TOKEN is not set in the environment.")

    catalog_path = Path("models_catalog_with_queries.json")
    if not catalog_path.exists():
        fallback = Path("models_catalog.json")
        if fallback.exists():
            print(f"Catalog {catalog_path} not found. Falling back to {fallback}.")
            catalog_path = fallback
        else:
            raise SystemExit(
                f"Catalog file not found: {catalog_path} or {fallback}"
            )

    catalog = load_catalog(catalog_path)
    rows = flatten_queries(catalog)
    if not rows:
        raise SystemExit("No queries found in catalog; nothing to embed.")

    print(f"Loaded {len(rows)} queries from {catalog_path}.")
    embeddings = build_embeddings(rows, token)
    print(f"Final embedding matrix shape: {embeddings.shape}")

    output_dir = Path("data")
    output_dir.mkdir(parents=True, exist_ok=True)

    embeddings_path = output_dir / "query_embeddings.npy"
    meta_path = output_dir / "query_meta.json"

    np.save(embeddings_path, embeddings)
    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    print(f"Saved embeddings to {embeddings_path}")
    print(f"Saved metadata to {meta_path}")


if __name__ == "__main__":
    main()
