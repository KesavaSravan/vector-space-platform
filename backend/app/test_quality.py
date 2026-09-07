import unittest
import numpy as np
from sklearn.decomposition import PCA
from reduction import calculate_visualization_quality

class TestVisualizationQuality(unittest.TestCase):
    def setUp(self):
        # Seed generator for reproducibility
        self.rng = np.random.default_rng(seed=42)
        # Create standard test data: 20 points, 128 dimensions
        self.X_orig = self.rng.random((20, 128)).tolist()
        self.X_3d = self.rng.random((20, 3))

    def test_pca_quality(self):
        # Fit standard PCA
        pca = PCA(n_components=3, random_state=42)
        X_pca = pca.fit_transform(np.array(self.X_orig))
        
        res = calculate_visualization_quality(self.X_orig, X_pca, "pca", pca)
        
        self.assertEqual(res["method"], "pca")
        self.assertIsNotNone(res["explained_variance"])
        self.assertGreater(res["explained_variance"], 0.0)
        self.assertLessEqual(res["explained_variance"], 100.0)
        
        self.assertGreaterEqual(res["neighbor_preservation"], 0.0)
        self.assertLessEqual(res["neighbor_preservation"], 100.0)
        
        self.assertGreaterEqual(res["distance_correlation"], -1.0)
        self.assertLessEqual(res["distance_correlation"], 1.0)
        
        self.assertGreaterEqual(res["trustworthiness"], 0.0)
        self.assertLessEqual(res["trustworthiness"], 1.0)
        
        self.assertGreaterEqual(res["quality_score"], 0.0)
        self.assertLessEqual(res["quality_score"], 100.0)
        
        self.assertIn(res["quality"], ["EXCELLENT", "GOOD", "FAIR", "POOR"])
        print("PCA test passed. Quality metrics:", res)

    def test_tsne_umap_quality(self):
        # t-SNE and UMAP don't have explained_variance
        res = calculate_visualization_quality(self.X_orig, self.X_3d, "umap", None)
        
        self.assertEqual(res["method"], "umap")
        self.assertIsNone(res["explained_variance"])
        
        self.assertGreaterEqual(res["neighbor_preservation"], 0.0)
        self.assertLessEqual(res["neighbor_preservation"], 100.0)
        
        self.assertGreaterEqual(res["distance_correlation"], -1.0)
        self.assertLessEqual(res["distance_correlation"], 1.0)
        
        self.assertGreaterEqual(res["trustworthiness"], 0.0)
        self.assertLessEqual(res["trustworthiness"], 1.0)
        
        self.assertGreaterEqual(res["quality_score"], 0.0)
        self.assertLessEqual(res["quality_score"], 100.0)
        
        self.assertIn(res["quality"], ["EXCELLENT", "GOOD", "FAIR", "POOR"])
        print("t-SNE/UMAP test passed. Quality metrics:", res)

    def test_small_dataset(self):
        # Small dataset of 3 points
        X_orig_small = self.rng.random((3, 10)).tolist()
        X_3d_small = self.rng.random((3, 3))
        
        res = calculate_visualization_quality(X_orig_small, X_3d_small, "tsne", None)
        self.assertEqual(res["method"], "tsne")
        self.assertIsNone(res["explained_variance"])
        self.assertGreaterEqual(res["quality_score"], 0.0)
        self.assertLessEqual(res["quality_score"], 100.0)
        print("Small dataset (N=3) test passed. Quality metrics:", res)

    def test_constant_distances(self):
        # All points are identical (constant distance = 0)
        X_orig_const = np.zeros((10, 5)).tolist()
        X_3d_const = np.zeros((10, 3))
        
        res = calculate_visualization_quality(X_orig_const, X_3d_const, "pca", None)
        self.assertEqual(res["distance_correlation"], 0.0)
        self.assertGreaterEqual(res["quality_score"], 0.0)
        self.assertLessEqual(res["quality_score"], 100.0)
        print("Constant distance test passed. Quality metrics:", res)

if __name__ == "__main__":
    unittest.main()
