import json
import csv
import io
from typing import List
from app.models import VectorInput

def parse_json_data(content: bytes) -> List[VectorInput]:
    """
    Parses vector data from JSON content bytes.
    Expects a list of objects with 'id', 'label', 'embedding', and optional 'metadata'.
    """
    data = json.loads(content.decode("utf-8"))
    if not isinstance(data, list):
        raise ValueError("JSON data must be a list of vector objects.")
    
    parsed = []
    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"Item at index {idx} is not a valid object.")
        
        vid = item.get("id")
        label = item.get("label")
        embedding = item.get("embedding")
        metadata = item.get("metadata", {})

        if not vid:
            raise ValueError(f"Item at index {idx} is missing 'id'.")
        if not label:
            raise ValueError(f"Item at index {idx} is missing 'label'.")
        if not isinstance(embedding, list):
            raise ValueError(f"Item at index {idx} ('{vid}') has missing or invalid 'embedding' (must be a list).")
        
        # Ensure embedding contains floats
        float_embedding = [float(x) for x in embedding]

        parsed.append(VectorInput(
            id=str(vid),
            label=str(label),
            embedding=float_embedding,
            metadata=dict(metadata)
        ))
    return parsed

def parse_csv_data(content: bytes) -> List[VectorInput]:
    """
    Parses vector data from CSV content bytes.
    Supports:
    1. Single 'embedding' column containing JSON array strings: e.g. "[0.12, 0.45, -0.22]"
    2. Wide format: columns 'dim_0', 'dim_1', ... 'dim_N'
    All other columns (excluding 'id' and 'label') are treated as metadata.
    """
    text_content = content.decode("utf-8")
    f = io.StringIO(text_content)
    reader = csv.DictReader(f)
    
    parsed = []
    for idx, row in enumerate(reader):
        vid = row.get("id")
        label = row.get("label")
        
        if not vid:
            # Fallback to index if id is missing
            vid = f"row_{idx}"
        if not label:
            label = f"Label {idx}"

        embedding = []
        metadata = {}

        # 1. Check for single stringified embedding array column
        if "embedding" in row and row["embedding"]:
            try:
                embedding = json.loads(row["embedding"])
                if not isinstance(embedding, list):
                    raise ValueError("Must be a list")
                embedding = [float(x) for x in embedding]
            except Exception:
                raise ValueError(f"Row {idx} ('{vid}') has invalid JSON string in 'embedding' column.")
        else:
            # 2. Check for wide format columns (dim_0, dim_1, ...)
            dim_keys = [k for k in row.keys() if k.startswith("dim_")]
            if dim_keys:
                # Sort dimensions numerically
                try:
                    dim_keys.sort(key=lambda x: int(x.split("_")[1]))
                    embedding = [float(row[k]) for k in dim_keys if row[k] is not None and row[k] != ""]
                except ValueError:
                    raise ValueError(f"Row {idx} ('{vid}') has non-numeric value in dimension columns.")
            else:
                raise ValueError(f"Row {idx} ('{vid}') lacks an 'embedding' column or 'dim_X' wide columns.")

        # Capture other fields as metadata
        for k, v in row.items():
            if k not in ["id", "label", "embedding"] and not k.startswith("dim_"):
                metadata[k] = v

        parsed.append(VectorInput(
            id=vid,
            label=label,
            embedding=embedding,
            metadata=metadata
        ))

    return parsed
