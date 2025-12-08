import json
import os
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import requests

HF_ENDPOINT = (
    "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5"
)


def load_catalog(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_embeddings(emb_path: Path, meta_path: Path):
    embeddings = np.load(emb_path).astype(np.float32)
    with meta_path.open("r", encoding="utf-8") as f:
        meta = json.load(f)
    if embeddings.shape[0] != len(meta):
        raise RuntimeError(
            f"Embeddings rows ({embeddings.shape[0]}) != meta entries ({len(meta)})"
        )
    return embeddings, meta


def embed_query(text: str, token: str) -> np.ndarray:
    if not token:
        raise RuntimeError("HF_TOKEN is required to call the Inference API")
    response = requests.post(
        HF_ENDPOINT,
        headers={
          "Authorization": f"Bearer {token}",
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        json={"inputs": [text]},
        timeout=60,
    )
    if not response.ok:
        raise RuntimeError(f"Inference API error {response.status_code}: {response.text}")
    data = response.json()
    try:
        arr = np.array(data, dtype=np.float32)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Unexpected embedding response: {data}") from exc
    if arr.ndim != 2 or arr.shape[0] != 1:
        raise RuntimeError(f"Embedding shape mismatch: got {arr.shape}, expected (1, D)")
    vec = arr[0]
    norm = np.linalg.norm(vec) + 1e-12
    return (vec / norm).astype(np.float32)


def cosine_search(
    query_vec: np.ndarray,
    embeddings: np.ndarray,
    meta: List[Dict[str, Any]],
    models_by_id: Dict[str, Dict[str, Any]],
    top_k: int = 10,
):
    sims = embeddings @ query_vec
    scores: Dict[str, float] = {}
    best_query: Dict[str, str] = {}

    for idx, m in enumerate(meta):
        model_id = m["model_id"]
        s = float(sims[idx])
        if model_id not in scores or s > scores[model_id]:
            scores[model_id] = s
            best_query[model_id] = m["query"]

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    results = []
    for model_id, score in ranked:
        model_meta = models_by_id.get(model_id, {})
        results.append(
            {
                "model_id": model_id,
                "name": model_meta.get("name", ""),
                "task": model_meta.get("task", []),
                "params": model_meta.get("params", ""),
                "license": model_meta.get("license", ""),
                "url": model_meta.get("url", ""),
                "score": score,
                "via": best_query.get(model_id, ""),
            }
        )
    return results


def main():
    token = os.environ.get("HF_TOKEN")
    if not token:
        raise SystemExit("HF_TOKEN is not set in the environment.")

    catalog_path = Path("models_catalog_with_queries.json")
    if not catalog_path.exists():
        fallback = Path("models_catalog.json")
        if fallback.exists():
            print(f"Catalog {catalog_path} not found. Falling back to {fallback}.")
            catalog_path = fallback
        else:
            raise SystemExit("Catalog file not found.")

    embeddings_path = Path("data/query_embeddings.npy")
    meta_path = Path("data/query_meta.json")
    if not embeddings_path.exists() or not meta_path.exists():
        raise SystemExit("Embeddings or metadata not found. Run build_index_via_inference_api.py first.")

    catalog = load_catalog(catalog_path)
    models_by_id = {m.get("id"): m for m in catalog}
    embeddings, meta = load_embeddings(embeddings_path, meta_path)

    print("Semantic search CLI. Type a description, or 'quit' to exit.")
    while True:
        try:
            user_input = input("Describe the model you need (or 'quit'): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye.")
            break

        if not user_input or user_input.lower() in {"quit", "q", "exit"}:
            print("Goodbye.")
            break

        try:
            q_vec = embed_query(user_input, token)
        except Exception as exc:  # noqa: BLE001
            print(f"Failed to embed query: {exc}")
            continue

        results = cosine_search(q_vec, embeddings, meta, models_by_id, top_k=10)
        if not results:
            print("No results.")
            continue

        print("\nTop matches:")
        for idx, res in enumerate(results, start=1):
            tasks = ", ".join(res["task"]) if isinstance(res["task"], list) else res["task"]
            print(f"{idx}. {res['model_id']}  (score={res['score']:.3f})")
            print(f"   name: {res['name']}")
            if tasks:
                print(f"   tasks: {tasks}")
            if res["params"]:
                print(f"   params: {res['params']}")
            if res["license"]:
                print(f"   license: {res['license']}")
            if res["url"]:
                print(f"   url: {res['url']}")
            if res["via"]:
                print(f"   via: {res['via']}")
        print("")


if __name__ == "__main__":
    main()
