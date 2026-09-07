import json
from fastapi.testclient import TestClient
from app.main import app
from app.store import store

client = TestClient(app)

print("1. Ingesting ServiceNow Sample Vectors...")
with open("sample_data/sample_vectors.json", "r") as f:
    vectors = json.load(f)

res = client.post("/upload-vectors-json", json={"vectors": vectors})
assert res.status_code == 200, f"Upload vectors failed: {res.text}"
print("Ingested vectors:", res.json())

print("\n2. Testing KMeans (Auto-K using Silhouette Analysis)...")
res = client.post("/cluster", json={"method": "kmeans", "n_clusters": -1})
assert res.status_code == 200, f"KMeans auto failed: {res.text}"
clusters = res.json()["clusters"]
unique_clusters = set(c["cluster"] for c in clusters)
print(f"KMeans Auto created {len(unique_clusters)} unique clusters: {sorted(list(unique_clusters))}")
assert len(unique_clusters) >= 2, "Expected at least 2 clusters"

print("\n3. Testing KMeans (Manual K=5)...")
res = client.post("/cluster", json={"method": "kmeans", "n_clusters": 5})
assert res.status_code == 200, f"KMeans manual failed: {res.text}"
clusters = res.json()["clusters"]
unique_clusters = set(c["cluster"] for c in clusters)
print(f"KMeans K=5 created {len(unique_clusters)} unique clusters: {sorted(list(unique_clusters))}")
assert len(unique_clusters) == 5, f"Expected 5 clusters, got {len(unique_clusters)}"

print("\n4. Testing DBSCAN (Auto-Epsilon estimation)...")
res = client.post("/cluster", json={"method": "dbscan", "eps": -1, "min_samples": 3})
assert res.status_code == 200, f"DBSCAN auto failed: {res.text}"
clusters = res.json()["clusters"]
unique_clusters = set(c["cluster"] for c in clusters)
print(f"DBSCAN Auto created {len(unique_clusters)} cluster labels (including noise -1): {sorted(list(unique_clusters))}")
assert len(unique_clusters) >= 2, "DBSCAN should find multiple clusters"
assert any(c["cluster"] >= 0 for c in clusters), "DBSCAN should find non-noise clusters"

print("\n5. Testing DBSCAN (Manual Cosine Epsilon=0.45)...")
res = client.post("/cluster", json={"method": "dbscan", "eps": 0.45, "min_samples": 3})
assert res.status_code == 200, f"DBSCAN manual failed: {res.text}"
clusters = res.json()["clusters"]
unique_clusters = set(c["cluster"] for c in clusters)
print(f"DBSCAN eps=0.45 created {len(unique_clusters)} labels: {sorted(list(unique_clusters))}")

print("\n6. Testing HDBSCAN (Hierarchical density clustering)...")
res = client.post("/cluster", json={"method": "hdbscan", "min_cluster_size": 4, "min_samples": 3})
assert res.status_code == 200, f"HDBSCAN failed: {res.text}"
clusters = res.json()["clusters"]
unique_clusters = set(c["cluster"] for c in clusters)
print(f"HDBSCAN created {len(unique_clusters)} cluster labels (including noise -1): {sorted(list(unique_clusters))}")
assert len(unique_clusters) >= 2, "HDBSCAN should find multiple clusters"

print("\n7. Testing Statistics endpoint after HDBSCAN...")
res = client.get("/statistics")
assert res.status_code == 200
stats = res.json()
print("Statistics summary:", {
    "total_vectors": stats["total_vectors"],
    "clusters_count": stats["clusters_count"],
    "outliers_count": stats["outliers_count"],
    "cluster_distribution": stats["cluster_distribution"]
})

print("\nALL CLUSTERING ENDPOINTS PASSED VERIFICATION WITH FLYING COLORS!")
