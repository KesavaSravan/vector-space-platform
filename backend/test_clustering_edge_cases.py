import unittest
import numpy as np
from app.clustering import run_clustering
from app.store import VectorStore
from app.models import VectorInput
from fastapi import HTTPException

class TestClusteringEdgeCases(unittest.TestCase):
    def test_empty_vectors(self):
        res_km = run_clustering([], [], method="kmeans")
        self.assertEqual(res_km, {})
        res_db = run_clustering([], [], method="dbscan")
        self.assertEqual(res_db, {})
        res_hdb = run_clustering([], [], method="hdbscan")
        self.assertEqual(res_hdb, {})

    def test_single_vector(self):
        emb = [list(np.random.rand(10).astype(float))]
        vids = ["v1"]
        
        # KMeans manual and auto
        res_km1 = run_clustering(emb, vids, method="kmeans", n_clusters=5)
        self.assertEqual(res_km1, {"v1": 0})
        res_km2 = run_clustering(emb, vids, method="kmeans", n_clusters=-1)
        self.assertEqual(res_km2, {"v1": 0})

        # DBSCAN manual and auto
        res_db1 = run_clustering(emb, vids, method="dbscan", eps=0.5)
        self.assertIn("v1", res_db1)
        res_db2 = run_clustering(emb, vids, method="dbscan", eps=-1)
        self.assertIn("v1", res_db2)

        # HDBSCAN manual and auto
        res_hdb1 = run_clustering(emb, vids, method="hdbscan", min_cluster_size=5)
        self.assertIn("v1", res_hdb1)
        res_hdb2 = run_clustering(emb, vids, method="hdbscan", min_cluster_size=-1)
        self.assertIn("v1", res_hdb2)

    def test_two_vectors(self):
        embs = [list(np.random.rand(10).astype(float)), list(np.random.rand(10).astype(float))]
        vids = ["v1", "v2"]

        res_km = run_clustering(embs, vids, method="kmeans", n_clusters=-1)
        self.assertEqual(len(res_km), 2)

        res_db = run_clustering(embs, vids, method="dbscan", eps=-1)
        self.assertEqual(len(res_db), 2)

        res_hdb = run_clustering(embs, vids, method="hdbscan", min_cluster_size=-1)
        self.assertEqual(len(res_hdb), 2)

    def test_unsupported_method(self):
        emb = [[0.1, 0.2]]
        with self.assertRaises(HTTPException):
            run_clustering(emb, ["v1"], method="invalid_method")

if __name__ == "__main__":
    unittest.main()
