import json
import sys

from gradio_client import Client


def main() -> None:
    """
    Small CLI helper to query the V1kstrand/model-scout-semantic HF Space
    from this repo, for debugging the semantic backend independently of
    the frontend.
    """
    client = Client("V1kstrand/model-scout-semantic")

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = input("Describe the model you need: ").strip() or "Small ViT for 224x224 image classification"

    try:
        result = client.predict(
            query=query,
            top_k=10,
            api_name="/semantic_search",
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Error calling HF Space: {exc}", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
