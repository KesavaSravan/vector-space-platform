import { useMemo } from "react";

export function useFilteredPoints(points, filters, similarity) {
  return useMemo(() => {
    if (!points || points.length === 0) return [];

    const {
      search,
      clusterFilter,
      severityFilter,
      metadataKey,
      metadataValue,
      similarityThreshold
    } = filters;

    const { matches, queryId } = similarity;

    // Build a map of similarity scores for fast O(1) matching
    const similarityMap = {};
    if (queryId && matches && matches.length > 0) {
      matches.forEach((m) => {
        similarityMap[m.id] = m.score;
      });
      // The query vector itself has similarity 1.0
      similarityMap[queryId] = 1.0;
    }

    return points.filter((p) => {
      // 1. Text Search (IDs or Labels)
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesId = p.id.toLowerCase().includes(searchLower);
        const matchesLabel = p.label.toLowerCase().includes(searchLower);
        if (!matchesId && !matchesLabel) {
          return false;
        }
      }

      // 2. Cluster Filter
      if (clusterFilter !== "" && clusterFilter !== undefined) {
        if (p.cluster.toString() !== clusterFilter.toString()) {
          return false;
        }
      }

      // 3. Severity Filter
      if (severityFilter) {
        const sev = p.metadata?.severity || p.severity || "Low";
        if (sev.toLowerCase() !== severityFilter.toLowerCase()) {
          return false;
        }
      }

      // 4. Similarity Threshold (only active when a point is selected)
      if (queryId) {
        const simScore = similarityMap[p.id];
        // If threshold is greater than 0, we filter points by similarity
        if (similarityThreshold > 0) {
          if (simScore === undefined) {
            return false; // Not in the top-K neighbors
          }
          const simPercent = simScore * 100.0;
          if (simPercent < similarityThreshold) {
            return false;
          }
        }
      }

      // 5. Metadata key/value filtering
      if (metadataKey) {
        const key = metadataKey.trim();
        const value = metadataValue ? metadataValue.trim().toLowerCase() : "";

        // Check nested metadata
        const metaObj = p.metadata || {};
        if (!(key in metaObj)) {
          return false;
        }

        if (value) {
          const actualVal = String(metaObj[key]).toLowerCase();
          if (!actualVal.includes(value)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [points, filters, similarity]);
}

export default useFilteredPoints;
