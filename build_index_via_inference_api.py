import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Any

import numpy as np
import requests

HF_ENDPOINT = (
    "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5"
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

    response = requests.post(
        HF_ENDPOINT,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json={"inputs": texts},
        timeout=60,
    )
    if not response.ok:
        raise RuntimeError(f"Inference API error {response.status_code}: {response.text}")

    data = response.json()
    try:
        arr = np.array(data, dtype=np.float32)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Unexpected embedding response shape: {data}") from exc

    if arr.ndim != 2 or arr.shape[0] != len(texts):
        raise RuntimeError(f"Embedding batch shape mismatch: got {arr.shape}, expected ({len(texts)}, D)")

    # L2 normalize
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    arr = arr / np.clip(norms, 1e-12, None)
    return arr.astype(np.float32)


def build_embeddings(rows: List[Dict[str, Any]], token: str) -> np.ndarray:
    vectors: List[np.ndarray] = []
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        texts = [r["query"] for r in batch]
        vectors.append(embed_batch(texts, token))
        print(f"Embedded batch {i // BATCH_SIZE + 1}/{(len(rows) - 1) // BATCH_SIZE + 1}")

    return np.vstack(vectors) if vectors else np.zeros((0, 0), dtype=np.float32)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--catalog",
        type=Path,
        default=Path("models_catalog_with_queries.json"),
        help="Path to the models catalog JSON",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("data"),
        help="Directory to write embeddings and metadata",
    )
    args = parser.parse_args()

    token = os.environ.get("HF_TOKEN")
    if not token:
        raise SystemExit("HF_TOKEN is not set in the environment.")

    catalog_path = args.catalog
    if not catalog_path.exists():
        # Fallback to existing catalog name if provided catalog is missing
        fallback = Path("models_catalog.json")
        if fallback.exists():
            print(f"Catalog {catalog_path} not found. Falling back to {fallback}.")
            catalog_path = fallback
        else:
            raise SystemExit(f"Catalog file not found: {args.catalog}")

    catalog = load_catalog(catalog_path)
    rows = flatten_queries(catalog)
    if not rows:
        raise SystemExit("No queries found in catalog; nothing to embed.")

    print(f"Loaded {len(rows)} queries from {catalog_path}.")
    embeddings = build_embeddings(rows, token)
    print(f"Final embedding matrix shape: {embeddings.shape}")

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    embeddings_path = output_dir / "query_embeddings.npy"
    meta_path = output_dir / "query_meta.json"

    np.save(embeddings_path, embeddings)
    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)

    print(f"Saved embeddings to {embeddings_path}")
    print(f"Saved metadata to {meta_path}")


if __name__ == "__main__":
    main()
