# AI Vector Space Visualization Platform

A production-quality 3D platform for uploading, analyzing, clustering, and visualizing high-dimensional vector spaces.

## Key Features
- **3D Visualization**: OrbitControls, Grid and Coordinate helper axes, and custom shaders/instancedMesh rendering supporting 100k+ data points.
- **Dimensionality Reduction**: PCA, t-SNE, and UMAP algorithms.
- **Clustering**: Interactive KMeans & DBSCAN parameter configuration with immediate visual updates.
- **Similarity Search**: Interactive soft-cyan connecting lines showing cosine/Euclidean neighbors with score overlays. FAISS auto-enabled for datasets $\ge 5000$ items.
- **Analytics**: Hand-drawn dashboard graphs showing cluster/severity percentages and metrics (average similarity, outliers).
- **Alert Intelligence Mode**: Built-in severity color schemes and dot-based chronological alert timeline.
- **Capability Landing Page**: Modern, entry-level capability overview page showcasing the platform's workflow with a far-right **Home** navigation toggle to easily switch between the 3D visualizer workspace and the portal.
- **AI Text Ingestion & Excel/CSV Parsing**: On-the-fly vectorization of raw text. Supports newline-separated lists, structured `Number - Text` rows, or standard Excel (`.xlsx`/`.xls`) and CSV uploads.
- **Multi-Provider AI Embedding Mode**: Interactive integrations with Google Gemini, Hugging Face Hub (via LangChain), OpenAI, Azure OpenAI, and local Sentence Transformers.
- **Hybrid Fallback & Lazy Loading**: Automatic fallback to local Sentence Transformers if cloud provider endpoints fail or hit rate limits, and lazy-loading of local models to minimize startup memory overhead.
- **Vector Space Exporter**: Export the processed vector space as an ordered CSV file containing coordinates for all dimensions.

---

## Folder Structure
```
vector-space-platform/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── sample_data/
│   │   ├── sample_ingest_data.csv
│   │   └── sample_ingest_data.xlsx
│   └── app/
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    ├── package.json
    └── src/
```

---

## Getting Started

### Method 1: Using Docker Compose (Recommended)
Make sure you have Docker installed, then run:
```bash
docker compose up --build
```
- Frontend will be available at: [http://localhost:3000](http://localhost:3000)
- Backend will be available at: [http://localhost:8000](http://localhost:8000)

### Method 2: Local Development Setup

#### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Unix:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

#### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   The local dev server runs on [http://localhost:5173](http://localhost:5173) and proxies `/api/*` requests to the local backend.

---

## File Format Specs

### Pre-computed Vector Files
If you already have embeddings computed:
- **JSON Format**:
  ```json
  [
    {
      "id": "alert_0001",
      "label": "CPU Spike",
      "embedding": [0.23, 0.45, 0.67, 0.12, 0.05, -0.11, 0.89, -0.45, 0.22, 0.11, 0.03, -0.21, 0.33, 0.14, 0.99, -0.87, 0.12, 0.02, 0.45, 0.66, -0.12, 0.02, 0.33, -0.19, 0.45, 0.12, -0.09, 0.88, 0.12, -0.11, 0.02, 0.15],
      "metadata": { "severity": "Critical", "source": "Azure Monitor", "service": "web-frontend", "timestamp": "2026-06-20T10:00:00Z" }
    }
  ]
  ```
- **CSV Format**:
  - *Wide Format*: Columns named `dim_0`, `dim_1`, ..., `dim_N` with additional metadata columns `id`, `label`, `severity`, `source`, `service`, `timestamp`.
  - *Stringified Embedding*: A column named `embedding` containing the JSON array as a string, e.g., `"[0.23, 0.45, 0.67]"` along with other metadata fields.

### AI Text Ingestion (Embeddings generated on-the-fly)
When using the **AI Text Vectorization** panel, you can import data via three inputs:
1. **Simple List**: Plain text strings entered in the text box (one document per line).
2. **Pasted Text (Structured)**: Text lines following the `Number - Text` format (e.g. `1 - Database migration completed`).
3. **Excel or CSV File Ingestion**: Upload a spreadsheet containing at least two columns matching `Number` and `Text` (searched case-insensitively, e.g. `Number`/`ID` and `Text`/`Content`).

---

## Embedding Provider Configuration

The platform supports multiple AI text vectorization providers which can be chosen interactively in the frontend.

### Provider Details
1. **Gemini (Cloud API)**:
   - Model: `gemini-embedding-001` (768 dimensions)
   - Configuration: Read from the `GEMINI_API_KEY` environment variable.
   - Optimization: Employs batch processing, automatic input cleaning, and exponential backoff retry mechanisms to handle 429 rate limits.
   - Platform Limit: Enforces a strict quota limit of 100 records per upload to prevent Google Cloud free-tier quota exhaustion.
2. **Sentence Transformers (Local Fallback)**:
   - Model: `all-MiniLM-L6-v2` (384 dimensions)
   - Cache & Lazy Loading: Cached locally on the backend. The model is **lazy-loaded only when requested** to minimize startup memory overhead.
3. **Hugging Face (Cloud API)**:
   - Integration: Utilizes LangChain (`langchain-huggingface`) to call Hugging Face Inference API models.
   - Model: Default is `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions), but can be customized.
   - Configuration: Authenticates using the `HF_TOKEN` or `HUGGINGFACEHUB_API_TOKEN` environment variables.
4. **OpenAI (Cloud API)** & **Azure OpenAI**:
   - Provide credentials directly in the frontend panel (never stored).

### Hybrid Embedding Strategy
To guarantee platform resilience, if the primary **Gemini** cloud embedding generation fails (e.g., due to network issues, bad keys, or quota issues after retries), the backend automatically implements a **local fallback strategy** to generate embeddings using the local Sentence Transformers model.

### Environment & Diagnostics
- **Startup Diagnostics**: The backend executes configuration checks and diagnostic runs on startup, reporting selected default providers and logging state info.
- **Diagnostic Endpoint**: Run `GET http://localhost:8000/embedding-diagnostic` to inspect API configuration, masked environment key setups, and resolved `.env` configurations.
- **Dotenv Loading**: Searches and loads `.env` configurations from the immediate working directory, parent `backend/` directory, and the project root directory recursively.

---

## Troubleshooting & Fallbacks

- **UMAP & FAISS Installation**: If UMAP or FAISS installation fails due to system compilation requirements, standard PCA/t-SNE algorithms and vectorized NumPy-based search will continue to function seamlessly as fallbacks.
- **Port Conflicts**: Ensure ports `3000` and `8000` are free on your host machine before starting docker compose.
- **Docker Frontend Cache**: If frontend changes do not show up in the browser, ensure you rebuild the Docker container images:
  ```bash
  docker compose down
  docker compose up --build
  ```
- **Exporting Computed Vector Spaces**: Once vectors are ingested and visual results are shown on screen, you can use the **Download CSV** action in the controls sidebar to download the projected space locally.

