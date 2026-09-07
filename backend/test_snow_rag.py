import os
import io
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.store import store

client = TestClient(app)

print("1. Testing /health endpoint...")
res = client.get("/health")
assert res.status_code == 200, f"Health check failed: {res.text}"
print("Health check response:", res.json())

print("\n2. Testing /parse-headers on ServiceNow Excel sample...")
sample_xlsx_path = "sample_data/servicenow_incidents_sample.xlsx"
assert os.path.exists(sample_xlsx_path), f"File not found: {sample_xlsx_path}"

with open(sample_xlsx_path, "rb") as f:
    file_bytes = f.read()

res = client.post(
    "/parse-headers",
    files={"file": ("servicenow_incidents_sample.xlsx", file_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
)
assert res.status_code == 200, f"Parse headers failed: {res.text}"
headers_data = res.json()
print("Parse headers response:", headers_data)
assert headers_data["detected_id"] == "Number", f"Expected Number, got {headers_data.get('detected_id')}"
assert "Short description" in headers_data["detected_vectors"], "Short description should be in detected vectors"

print("\n3. Testing /generate-embeddings-file with ServiceNow Excel sample using local sentence-transformers...")
res = client.post(
    "/generate-embeddings-file",
    files={"file": ("servicenow_incidents_sample.xlsx", file_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    data={
        "provider": "sentence-transformers",
        "model": "all-MiniLM-L6-v2",
        "id_column": "Number",
        "vector_columns": '["Short description", "Description", "Resolution notes"]'
    }
)
assert res.status_code == 200, f"Generate embeddings failed: {res.text}"
summary = res.json()
print("Ingest summary:", summary)
assert summary["accepted"] > 0, "No vectors were accepted"

print("\n4. Testing /reduce-dimensions...")
res = client.post("/reduce-dimensions", json={"method": "pca", "n_components": 3})
assert res.status_code == 200, f"Dimension reduction failed: {res.text}"
red_data = res.json()
print(f"Dimension reduction returned {len(red_data['points'])} points.")
assert len(red_data["points"]) > 0

# Check first point metadata
first_pt = red_data["points"][0]
print("First point sample:", {
    "id": first_pt["id"],
    "severity": first_pt["severity"],
    "coords": first_pt["coords"],
    "priority": first_pt["metadata"].get("priority"),
    "category": first_pt["metadata"].get("category"),
    "ci": first_pt["metadata"].get("configuration_item")
})

print("\n5. Testing /cluster with KMeans...")
res = client.post("/cluster", json={"method": "kmeans", "n_clusters": 5})
assert res.status_code == 200, f"Clustering failed: {res.text}"
print(f"Clustered {len(res.json()['clusters'])} vectors.")

print("\n6. Testing /statistics...")
res = client.get("/statistics")
assert res.status_code == 200
print("Statistics:", res.json())

print("\n7. Testing /similarity search on INC0010001 (VPN issue)...")
res = client.post("/similarity", json={"vector_id": "INC0010001", "top_k": 3})
assert res.status_code == 200
matches = res.json()["matches"]
print("Top 3 matches for INC0010001:")
for m in matches:
    print(f" - {m['id']}: {m['label']} (Score: {m['score']:.4f})")

print("\nALL BACKEND SERVICENOW RAG TESTS PASSED SUCCESSFULLY!")
