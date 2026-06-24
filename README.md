# AI Vector Space Visualization Platform

A production-quality 3D platform for uploading, analyzing, clustering, and visualizing high-dimensional vector spaces. 

## Key Features
- **3D Visualization**: OrbitControls, Grid and Coordinate helper axes, and custom shaders/instancedMesh rendering supporting 100k+ data points.
- **Dimensionality Reduction**: PCA, t-SNE, and UMAP algorithms.
- **Clustering**: Interactive KMeans & DBSCAN parameter configuration with immediate visual updates.
- **Similarity Search**: Interactive soft-cyan connecting lines showing cosine/Euclidean neighbors with score overlays. FAISS auto-enabled for datasets $\ge 5000$ items.
- **Analytics**: Hand-drawn dashboard graphs showing cluster/severity percentages and metrics (average similarity, outliers).
- **Alert Intelligence Mode**: Built-in severity color schemes and dot-based chronological alert timeline.
- **AI Embedding Mode**: Local Sentence Transformers, OpenAI, and Azure OpenAI integration.

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

### JSON Format
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

### CSV Format
Can be uploaded as:
- **Wide Format**: Columns named `dim_0`, `dim_1`, ..., `dim_N` with additional metadata columns `id`, `label`, `severity`, `source`, `service`, `timestamp`.
- **Stringified Embedding**: A column named `embedding` containing the JSON array as a string, e.g., `"[0.23, 0.45, 0.67]"` along with other metadata fields.

---

## Embedding Provider Configuration

The platform supports multiple AI text vectorization providers which can be chosen interactively in the frontend.

### Provider Details
1. **Gemini (Cloud API)**:
   - Model: `gemini-embedding-001` (768 dimensions)
   - Configuration: Read from the `GEMINI_API_KEY` environment variable.
2. **Sentence Transformers (Local)**:
   - Model: `all-MiniLM-L6-v2` (384 dimensions)
   - Running locally and cached on the backend (requires no API keys).
3. **OpenAI (Cloud API)** & **Azure OpenAI**:
   - Provide credentials directly in the frontend panel (never stored).

### Configuring `GEMINI_API_KEY`
- **Docker Compose**: Create a `.env` file in the project root directory and add:
  ```env
  GEMINI_API_KEY=your_api_key_here
  ```
- **Local Dev**: You can place `.env` in the `backend/` directory or set it as a system environment variable.

### Diagnostic Tools
The backend performs startup configuration checks and diagnostic runs on startup. You can also query the API endpoint to verify your setup:
- **Diagnostic Endpoint**: `GET http://localhost:8000/embedding-diagnostic`

---

## Troubleshooting & Fallbacks

- **UMAP & FAISS Installation**: If UMAP or FAISS installation fails due to system compilation requirements, standard PCA/t-SNE algorithms and vectorized NumPy-based search will continue to function seamlessly as fallbacks.
- **Port Conflicts**: Ensure ports `3000` and `8000` are free on your host machine before starting docker compose.
- **Docker Frontend Cache**: If frontend changes (such as the provider selection list) do not show up in the browser, ensure you rebuild the Docker container images:
  ```bash
  docker compose down
  docker compose up --build
  ```
