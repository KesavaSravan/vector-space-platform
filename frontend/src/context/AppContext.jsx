import React, { createContext, useContext, useReducer } from "react";
import { api } from "../api/client";

// Context definitions
const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

const initialState = {
  view: "landing", // "landing" | "app"
  mode: "general", // "general" | "alert"
  points: [], // Array of { id, label, coords: [x,y,z], cluster, severity, metadata }
  dimension: null,
  totalVectors: 0,
  selectedId: null,
  hoveredId: null,
  similarity: { matches: [], queryId: null },
  filters: {
    search: "",
    clusterFilter: "", // "" means all, or string index
    severityFilter: "", // "" means all, or Critical, High, etc.
    metadataKey: "",
    metadataValue: "",
    similarityThreshold: 0 // 0 to 100
  },
  algo: {
    reductionMethod: "pca", // "pca" | "tsne" | "umap"
    nComponents: 3, // 2 | 3
    clusterMethod: "kmeans", // "kmeans" | "dbscan"
    nClusters: 5,
    eps: 0.5,
    minSamples: 5,
    colorBy: "cluster", // "cluster" | "severity"
    metric: "cosine" // "cosine" | "euclidean"
  },
  statistics: null,
  loading: {
    upload: false,
    reduce: false,
    cluster: false,
    similarity: false,
    embed: false
  },
  error: null,
  notice: null,
  lastUploadSummary: null
};

// Reducer Actions
function appReducer(state, action) {
  switch (action.type) {
    case "SET_VIEW":
      return {
        ...state,
        view: action.payload
      };
    case "SET_MODE":
      return {
        ...state,
        mode: action.payload,
        // Alert mode forces colorBy to severity
        algo: {
          ...state.algo,
          colorBy: action.payload === "alert" ? "severity" : state.algo.colorBy
        }
      };
    case "START_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.payload]: true },
        error: null
      };
    case "STOP_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.payload]: false }
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        notice: null
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null
      };
    case "SET_NOTICE":
      return {
        ...state,
        notice: action.payload
      };
    case "CLEAR_NOTICE":
      return {
        ...state,
        notice: null
      };
    case "UPLOAD_SUCCESS":
      const ingestNotice = `Successfully ingested ${action.payload.accepted} vectors (rejected ${action.payload.rejected}).`;
      const warningText = action.payload.warning ? `${action.payload.warning} ` : "";
      return {
        ...state,
        totalVectors: action.payload.total_vectors,
        dimension: action.payload.dimension,
        lastUploadSummary: action.payload,
        notice: `${warningText}${ingestNotice}`
      };
    case "REDUCTION_SUCCESS":
      return {
        ...state,
        points: action.payload,
        selectedId: null,
        hoveredId: null,
        similarity: { matches: [], queryId: null },
        filters: {
          ...state.filters,
          similarityThreshold: 0
        }
      };
    case "CLUSTERING_SUCCESS": {
      // payload is array of ClusterItem { id, cluster }
      const clusterMap = {};
      action.payload.forEach((item) => {
        clusterMap[item.id] = item.cluster;
      });
      const updatedPoints = state.points.map((p) => ({
        ...p,
        cluster: clusterMap[p.id] !== undefined ? clusterMap[p.id] : p.cluster
      }));
      return {
        ...state,
        points: updatedPoints
      };
    }
    case "SIMILARITY_SUCCESS":
      return {
        ...state,
        similarity: {
          matches: action.payload.matches,
          queryId: action.payload.queryId
        }
      };
    case "SET_HOVERED":
      return {
        ...state,
        hoveredId: action.payload
      };
    case "SET_SELECTED":
      return {
        ...state,
        selectedId: action.payload,
        // Reset similarity threshold and matches if selection cleared
        similarity: action.payload ? state.similarity : { matches: [], queryId: null },
        filters: {
          ...state.filters,
          similarityThreshold: action.payload ? state.filters.similarityThreshold : 0
        }
      };
    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    case "SET_ALGO":
      return {
        ...state,
        algo: { ...state.algo, ...action.payload }
      };
    case "STATISTICS_SUCCESS":
      return {
        ...state,
        statistics: action.payload
      };
    case "CLEAR_ALL":
      return {
        ...initialState,
        mode: state.mode // preserve general/alert mode selection
      };
    default:
      return state;
  }
}

// Provider Component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// Custom Hooks to access State/Dispatch
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within an AppProvider");
  return context;
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (!context) throw new Error("useAppDispatch must be used within an AppProvider");
  return context;
}

// Async Action Creators Helper
export function useAppActions() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const setError = (err) => {
    const msg = err.response?.data?.detail || err.message || "An unknown error occurred.";
    dispatch({ type: "SET_ERROR", payload: msg });
  };

  const clearError = () => dispatch({ type: "CLEAR_ERROR" });
  const clearNotice = () => dispatch({ type: "CLEAR_NOTICE" });
  const setNotice = (msg) => dispatch({ type: "SET_NOTICE", payload: msg });

  const refreshStatistics = async () => {
    try {
      const stats = await api.getStatistics();
      dispatch({ type: "STATISTICS_SUCCESS", payload: stats });
    } catch (err) {
      console.error("Failed to fetch statistics", err);
    }
  };

  const runReduction = async (method = state.algo.reductionMethod, nComponents = state.algo.nComponents) => {
    dispatch({ type: "START_LOADING", payload: "reduce" });
    try {
      const response = await api.reduceDimensions({
        method,
        n_components: nComponents,
        perplexity: state.algo.perplexity || 30.0,
        n_neighbors: state.algo.nNeighbors || 15,
        min_dist: state.algo.minDist || 0.1
      });
      dispatch({ type: "REDUCTION_SUCCESS", payload: response });
      await refreshStatistics();
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "reduce" });
    }
  };

  const uploadFile = async (file) => {
    dispatch({ type: "START_LOADING", payload: "upload" });
    try {
      const summary = await api.uploadFile(file);
      dispatch({ type: "UPLOAD_SUCCESS", payload: summary });
      // Trigger automatic reduction on success
      await runReduction(state.algo.reductionMethod, state.algo.nComponents);
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "upload" });
    }
  };

  const uploadSampleDataset = async () => {
    dispatch({ type: "START_LOADING", payload: "upload" });
    try {
      // Fetch sample vectors statically from public folder
      const res = await fetch("/sample-data/sample_vectors.json");
      const vectors = await res.json();
      const summary = await api.uploadVectorsJson(vectors);
      dispatch({ type: "UPLOAD_SUCCESS", payload: summary });
      // Trigger automatic reduction
      await runReduction(state.algo.reductionMethod, state.algo.nComponents);
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "upload" });
    }
  };

  const runClustering = async (method = state.algo.clusterMethod, params = {}) => {
    dispatch({ type: "START_LOADING", payload: "cluster" });
    try {
      const clusterParams = {
        method,
        n_clusters: params.nClusters !== undefined ? params.nClusters : state.algo.nClusters,
        eps: params.eps !== undefined ? params.eps : state.algo.eps,
        min_samples: params.minSamples !== undefined ? params.minSamples : state.algo.minSamples
      };
      const response = await api.clusterVectors(clusterParams);
      dispatch({ type: "CLUSTERING_SUCCESS", payload: response.clusters });
      await refreshStatistics();
      setNotice(`Successfully clustered using ${method.toUpperCase()}.`);
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "cluster" });
    }
  };

  const runSimilarity = async (vectorId) => {
    dispatch({ type: "START_LOADING", payload: "similarity" });
    try {
      const response = await api.searchSimilarity({
        vector_id: vectorId,
        top_k: 10,
        metric: state.algo.metric
      });
      dispatch({ type: "SIMILARITY_SUCCESS", payload: response });
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "similarity" });
    }
  };

  const selectVector = async (id) => {
    if (state.selectedId === id) {
      // Toggle off if clicking the same vector again
      dispatch({ type: "SET_SELECTED", payload: null });
    } else {
      dispatch({ type: "SET_SELECTED", payload: id });
      if (id) {
        await runSimilarity(id);
      }
    }
  };

  const generateTextEmbeddings = async (embedParams) => {
    dispatch({ type: "START_LOADING", payload: "embed" });
    try {
      const summary = await api.generateEmbeddings(embedParams);
      dispatch({ type: "UPLOAD_SUCCESS", payload: summary });
      // Trigger automatic reduction
      await runReduction(state.algo.reductionMethod, state.algo.nComponents);
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "embed" });
    }
  };

  const generateTextEmbeddingsStructured = async (embedParams) => {
    dispatch({ type: "START_LOADING", payload: "embed" });
    try {
      const summary = await api.generateEmbeddingsText(embedParams);
      dispatch({ type: "UPLOAD_SUCCESS", payload: summary });
      await runReduction(state.algo.reductionMethod, state.algo.nComponents);
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "embed" });
    }
  };

  const generateFileEmbeddings = async (formData) => {
    dispatch({ type: "START_LOADING", payload: "embed" });
    try {
      const summary = await api.generateEmbeddingsFile(formData);
      dispatch({ type: "UPLOAD_SUCCESS", payload: summary });
      await runReduction(state.algo.reductionMethod, state.algo.nComponents);
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "embed" });
    }
  };

  const downloadEmbeddingsCsv = async () => {
    try {
      const blob = await api.downloadEmbeddingsCsv();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "vector_embeddings.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      dispatch({ type: "SET_NOTICE", payload: "CSV download started successfully." });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "An unknown error occurred.";
      dispatch({ type: "SET_ERROR", payload: msg });
    }
  };

  const clearAll = async () => {
    try {
      await api.clearVectors();
      dispatch({ type: "CLEAR_ALL" });
    } catch (err) {
      setError(err);
    }
  };

  const updateFilters = (newFilters) => {
    dispatch({ type: "SET_FILTERS", payload: newFilters });
  };

  const updateAlgo = (newAlgo) => {
    dispatch({ type: "SET_ALGO", payload: newAlgo });
  };

  const setHovered = (id) => {
    dispatch({ type: "SET_HOVERED", payload: id });
  };

  const setMode = (mode) => {
    dispatch({ type: "SET_MODE", payload: mode });
  };

  const setView = (view) => {
    dispatch({ type: "SET_VIEW", payload: view });
  };

  return {
    uploadFile,
    uploadSampleDataset,
    runReduction,
    runClustering,
    runSimilarity,
    selectVector,
    generateTextEmbeddings,
    generateTextEmbeddingsStructured,
    generateFileEmbeddings,
    downloadEmbeddingsCsv,
    clearAll,
    refreshStatistics,
    updateFilters,
    updateAlgo,
    setHovered,
    setMode,
    setView,
    setError,
    clearError,
    clearNotice,
    setNotice
  };
}
