import React, { createContext, useContext, useReducer } from "react";
import { api } from "../api/client";

// Context definitions
const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

const initialState = {
  view: "landing", // "landing" | "app"
  points: [], // Array of { id, label, coords: [x,y,z], cluster, severity, metadata }
  visualizationQuality: null,
  dimension: null,
  totalVectors: 0,
  selectedId: null,
  hoveredId: null,
  similarity: { matches: [], queryId: null },
  filters: {
    search: "",
    clusterFilter: "", // "" means all, or string index
    metadataKey: "",
    metadataValue: "",
    similarityThreshold: 0 // 0 to 100
  },
  algo: {
    reductionMethod: "pca", // "pca" | "tsne" | "umap"
    nComponents: 3, // 2 | 3
    clusterMethod: "kmeans", // "kmeans" | "dbscan"
    nClusters: -1,
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
  lastUploadSummary: null,
  dockLanding: false,
  chatMessages: [],
  chatLoading: false,
  chatReferences: [],
  chatSettings: {
    provider: "gemini",
    model: "gemini-2.5-flash",
    apiKey: "",
    groqKey: "",
    embeddingApiKey: "",
    useRag: false,
    topK: 5
  },
  selectedIds: [],
  lassoMode: false,
  pointStyle: "auto"
};

// Reducer Actions
function appReducer(state, action) {
  switch (action.type) {
    case "SET_VIEW":
      return {
        ...state,
        view: action.payload
      };
    case "TOGGLE_DOCK_LANDING":
      return {
        ...state,
        dockLanding: !state.dockLanding
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
        points: action.payload.points,
        visualizationQuality: action.payload.quality,
        selectedId: null,
        selectedIds: [],
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
    case "UPDATE_POINTS_SUCCESS":
      return {
        ...state,
        points: action.payload
      };
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
        selectedIds: action.payload ? [action.payload] : [],
        // Reset similarity threshold and matches if selection cleared
        similarity: action.payload ? state.similarity : { matches: [], queryId: null },
        filters: {
          ...state.filters,
          similarityThreshold: action.payload ? state.filters.similarityThreshold : 0
        }
      };
    case "SET_LASSO_MODE":
      return {
        ...state,
        lassoMode: action.payload
      };
    case "SET_SELECTED_IDS":
      return {
        ...state,
        selectedIds: action.payload,
        selectedId: action.payload.length === 1 ? action.payload[0] : null
      };
    case "SET_POINT_STYLE":
      return {
        ...state,
        pointStyle: action.payload
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
    case "SET_CHAT_LOADING":
      return { ...state, chatLoading: action.payload };
    case "SEND_CHAT_MESSAGE":
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case "SET_CHAT_REFERENCES":
      return { ...state, chatReferences: action.payload };
    case "UPDATE_CHAT_SETTINGS":
      return { ...state, chatSettings: { ...state.chatSettings, ...action.payload } };
    case "CLEAR_CHAT":
      return { ...state, chatMessages: [], chatReferences: [] };
    case "CLEAR_ALL":
      return initialState;
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

  const parseHeaders = async (formData) => {
    try {
      const response = await api.parseHeaders(formData);
      return response;
    } catch (err) {
      setError(err);
      throw err;
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

  const updateChatSettings = (settings) => {
    dispatch({ type: "UPDATE_CHAT_SETTINGS", payload: settings });
  };

  const clearChat = () => {
    dispatch({ type: "CLEAR_CHAT" });
  };

  const setChatReferences = (ids) => {
    dispatch({ type: "SET_CHAT_REFERENCES", payload: ids });
  };

  const sendChatMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMsg = { role: "user", content: messageText };
    dispatch({ type: "SEND_CHAT_MESSAGE", payload: userMsg });
    dispatch({ type: "SET_CHAT_LOADING", payload: true });

    try {
      const chatHistory = state.chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const activeKey = state.chatSettings.provider === "gemini" 
        ? state.chatSettings.apiKey 
        : state.chatSettings.groqKey;

      const response = await api.postChat({
        message: messageText,
        chat_history: chatHistory,
        provider: state.chatSettings.provider,
        model: state.chatSettings.model,
        api_key: activeKey || undefined,
        embedding_api_key: state.chatSettings.embeddingApiKey || undefined,
        use_rag: state.chatSettings.useRag,
        top_k: state.chatSettings.topK
      });

      const assistantMsg = { 
        role: "assistant", 
        content: response.answer,
        context_nodes: response.context_nodes,
        ui_actions: response.ui_actions 
      };
      
      dispatch({ type: "SEND_CHAT_MESSAGE", payload: assistantMsg });
      
      if (state.chatSettings.useRag && response.context_nodes) {
        const ids = response.context_nodes.map(n => n.id);
        dispatch({ type: "SET_CHAT_REFERENCES", payload: ids });
      } else {
        dispatch({ type: "SET_CHAT_REFERENCES", payload: [] });
      }

      // Execute AI UI control actions
      if (response.ui_actions && response.ui_actions.length > 0) {
        response.ui_actions.forEach((act) => {
          if (act.action === "set_color_by") {
            dispatch({ type: "SET_ALGO", payload: { colorBy: act.value } });
          } else if (act.action === "set_filter") {
            dispatch({ type: "SET_FILTERS", payload: { [act.field]: act.value } });
          } else if (act.action === "select_node") {
            dispatch({ type: "SET_SELECTED", payload: act.id });
            if (act.id) {
              runSimilarity(act.id);
            }
          } else if (act.action === "reset_filters") {
            dispatch({
              type: "SET_FILTERS",
              payload: {
                search: "",
                clusterFilter: "",
                metadataKey: "",
                metadataValue: "",
                similarityThreshold: 0
              }
            });
          }
        });
      }

    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "SET_CHAT_LOADING", payload: false });
    }
  };

  const setLassoMode = (active) => {
    dispatch({ type: "SET_LASSO_MODE", payload: active });
  };

  const setSelectedIds = async (ids) => {
    dispatch({ type: "SET_SELECTED_IDS", payload: ids });
    if (ids.length === 1) {
      await runSimilarity(ids[0]);
    }
  };

  const setPointStyle = (style) => {
    dispatch({ type: "SET_POINT_STYLE", payload: style });
  };

  const bulkUpdateVectors = async (ids, fields) => {
    dispatch({ type: "START_LOADING", payload: "cluster" });
    try {
      await api.bulkUpdateVectors(ids, fields);
      
      const updatedPoints = state.points.map((p) => {
        if (ids.includes(p.id)) {
          const newP = { ...p };
          if (fields.label !== undefined) newP.label = fields.label;
          if (fields.cluster !== undefined) newP.cluster = parseInt(fields.cluster);
          if (fields.severity !== undefined) {
            newP.severity = fields.severity;
            newP.metadata = { ...newP.metadata, severity: fields.severity };
          }
          if (fields.metadata !== undefined) {
            newP.metadata = { ...newP.metadata, ...fields.metadata };
          }
          return newP;
        }
        return p;
      });
      
      dispatch({ type: "UPDATE_POINTS_SUCCESS", payload: updatedPoints });
      await refreshStatistics();
      dispatch({ type: "SET_NOTICE", payload: `Successfully updated ${ids.length} vectors.` });
    } catch (err) {
      setError(err);
    } finally {
      dispatch({ type: "STOP_LOADING", payload: "cluster" });
    }
  };

  const setView = (view) => {
    dispatch({ type: "SET_VIEW", payload: view });
  };

  const toggleDockLanding = () => {
    dispatch({ type: "TOGGLE_DOCK_LANDING" });
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
    parseHeaders,
    downloadEmbeddingsCsv,
    clearAll,
    refreshStatistics,
    updateFilters,
    updateAlgo,
    setHovered,
    setView,
    toggleDockLanding,
    setError,
    clearError,
    clearNotice,
    setNotice,
    updateChatSettings,
    clearChat,
    setChatReferences,
    sendChatMessage,
    setLassoMode,
    setSelectedIds,
    setPointStyle,
    bulkUpdateVectors
  };
}
