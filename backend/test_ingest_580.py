import os
import sys
import time
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from app.models import VectorInput
from app.store import store
from app.graph import graph_store

def test_large_ingest():
    print("Testing 581 vectors ingestion...")
    t0 = time.time()
    store.clear()

    vectors = []
    for i in range(581):
        vid = f"INC{10000 + i}"
        vectors.append(
            VectorInput(
                id=vid,
                label=f"Service Incident ticket {i}",
                embedding=list(np.random.randn(384)),
                metadata={
                    "service": f"Service_{i % 10}",
                    "severity": "Critical" if i % 4 == 0 else "Medium",
                    "category": f"Category_{i % 5}",
                    "original_text": f"Incident {vid} occurred on component {i % 10}"
                }
            )
        )

    res = store.add_vectors(vectors)
    duration = time.time() - t0
    print(f"Successfully ingested {res['accepted']} vectors in {duration:.3f}s!")
    
    summary = graph_store.get_graph_summary()
    print("Graph Summary after 581 vectors:", summary)
    assert res["accepted"] == 581

if __name__ == "__main__":
    test_large_ingest()
