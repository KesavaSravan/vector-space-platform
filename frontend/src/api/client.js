import axios from "axios";

// If the environment variable VITE_API_URL is provided, use it (with fallback to "/api" proxy
// if it references the docker-internal hostname or localhost).
// If VITE_API_URL is not set, fallback to "/api" in development mode (Vite proxy)
// and GCP production URL in production mode.
const envUrl = import.meta.env.VITE_API_URL;
const baseURL = envUrl
  ? ((envUrl.includes("//backend:") || envUrl === "http://localhost:8000") ? "/api" : envUrl)
  : (import.meta.env.DEV ? "/api" : "https://backend-570296158927.asia-south1.run.app");

const client = axios.create({
  baseURL
});

export const api = {
  // Ingest
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await client.post("/upload-vectors", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  uploadVectorsJson: async (vectors) => {
    const response = await client.post("/upload-vectors-json", { vectors });
    return response.data;
  },

  clearVectors: async () => {
    const response = await client.delete("/vectors");
    return response.data;
  },

  getVectors: async (page = 1, limit = 50, search = "", cluster = null) => {
    const params = { page, limit };
    if (search) params.search = search;
    if (cluster !== null && cluster !== undefined) params.cluster = cluster;
    const response = await client.get("/vectors", { params });
    return response.data;
  },

  getVectorDetails: async (id) => {
    const response = await client.get(`/vector/${id}`);
    return response.data;
  },

  // Reduction
  reduceDimensions: async (params) => {
    // params: { method, n_components, perplexity, n_neighbors, min_dist }
    const response = await client.post("/reduce-dimensions", params);
    return response.data;
  },

  // Clustering
  clusterVectors: async (params) => {
    // params: { method, n_clusters, eps, min_samples }
    const response = await client.post("/cluster", params);
    return response.data;
  },

  // Similarity
  searchSimilarity: async (params) => {
    // params: { vector_id, embedding, top_k, metric }
    const response = await client.post("/similarity", params);
    return response.data;
  },

  // Statistics
  getStatistics: async () => {
    const response = await client.get("/statistics");
    return response.data;
  },

  // Embeddings Generator
  generateEmbeddings: async (params) => {
    // params: { provider, documents, model, api_key, azure_endpoint, azure_deployment }
    const response = await client.post("/generate-embeddings", params);
    return response.data;
  },

  generateEmbeddingsText: async (params) => {
    // params: { provider, text_data, model, api_key, azure_endpoint, azure_deployment, batch_size }
    const response = await client.post("/generate-embeddings-text", params);
    return response.data;
  },

  generateEmbeddingsFile: async (formData) => {
    const response = await client.post("/generate-embeddings-file", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  parseHeaders: async (formData) => {
    const response = await client.post("/parse-headers", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  downloadEmbeddingsCsv: async () => {
    const response = await client.get("/download-embeddings-csv", {
      responseType: "blob"
    });
    return response.data;
  }
};

export default client;
