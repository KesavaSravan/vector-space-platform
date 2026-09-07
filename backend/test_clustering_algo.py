import json
import numpy as np
from sklearn.preprocessing import normalize
from sklearn.cluster import DBSCAN, HDBSCAN, KMeans
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import silhouette_score

with open('sample_data/sample_vectors.json') as f:
    data = json.load(f)

vecs = np.array([item['embedding'] for item in data], dtype=np.float32)
vecs_norm = normalize(vecs)
print(f"Loaded {vecs.shape[0]} vectors of dimension {vecs.shape[1]}")

# 1. HDBSCAN
print("\n--- Testing HDBSCAN ---")
hdb = HDBSCAN(min_cluster_size=4, metric='euclidean')
hdb_labels = hdb.fit_predict(vecs_norm)
unique, counts = np.unique(hdb_labels, return_counts=True)
print("HDBSCAN clusters distribution:", dict(zip(unique.tolist(), counts.tolist())))

# 2. DBSCAN with auto-eps
print("\n--- Testing DBSCAN (Auto-Eps on Cosine Distance) ---")
k = 4
nbrs = NearestNeighbors(n_neighbors=k, metric='cosine').fit(vecs_norm)
distances, _ = nbrs.kneighbors(vecs_norm)
k_distances = np.sort(distances[:, -1])
auto_eps = float(np.percentile(k_distances, 75))
print(f"Calculated Auto-Eps (75th percentile): {auto_eps:.4f}")

db = DBSCAN(eps=auto_eps, min_samples=3, metric='cosine')
db_labels = db.fit_predict(vecs_norm)
unique_db, counts_db = np.unique(db_labels, return_counts=True)
print("DBSCAN clusters distribution:", dict(zip(unique_db.tolist(), counts_db.tolist())))

# 3. KMeans Auto
print("\n--- Testing KMeans (Auto Silhouette) ---")
scores = []
for k in range(2, 10):
    km = KMeans(n_clusters=k, random_state=42, n_init=5).fit(vecs_norm)
    score = silhouette_score(vecs_norm, km.labels_)
    scores.append((k, score))
best_k = max(scores, key=lambda x: x[1])[0]
print(f"KMeans optimal K: {best_k}")
for k, s in scores:
    print(f"  K={k}: Silhouette = {s:.4f}")

print("\nALL CLUSTERING TESTS EXECUTED PERFECTLY!")
