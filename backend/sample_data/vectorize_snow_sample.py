import json
import pandas as pd
from sentence_transformers import SentenceTransformer

print("Loading sentence-transformers model...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

csv_path = "e:/my_projects/vector_space_platform_all/vector-space-platform-main-v4-SNOW/backend/sample_data/servicenow_incidents_sample.csv"
df = pd.read_csv(csv_path)

# Combine ServiceNow fields into rich text for embeddings
combined_texts = []
records = []

for idx, row in df.iterrows():
    num = str(row["Number"])
    sd = str(row["Short description"])
    desc = str(row["Description"])
    res = str(row["Resolution notes"])
    cat = str(row["Category"])
    ci = str(row["Configuration item"])
    pri = str(row["Priority"])
    
    # Priority to severity mapping
    p_lower = pri.lower()
    if "1" in p_lower or "critical" in p_lower:
        sev = "Critical"
    elif "2" in p_lower or "high" in p_lower:
        sev = "High"
    elif "3" in p_lower or "moderate" in p_lower or "medium" in p_lower:
        sev = "Medium"
    else:
        sev = "Low"

    text_to_embed = f"[{num}] {sd} | Category: {cat} | CI: {ci} | Description: {desc} | Resolution: {res}"
    combined_texts.append(text_to_embed)
    
    metadata = {
        "source": "ServiceNow Incidents Sample",
        "original_number": num,
        "original_text": text_to_embed,
        "short_description": sd,
        "description": desc,
        "resolution_notes": res,
        "priority": pri,
        "severity": sev,
        "state": str(row["State"]),
        "category": cat,
        "subcategory": str(row["Subcategory"]),
        "assignment_group": str(row["Assignment group"]),
        "configuration_item": ci,
        "caller": str(row["Caller"]),
        "created": str(row["Created"]),
        "resolved": str(row["Resolved"]),
        "Embedding_Provider": "sentence-transformers",
        "Embedding_Model": "all-MiniLM-L6-v2",
        "Vector_Dimension": 384
    }
    records.append((num, sd, metadata))

print(f"Generating embeddings for {len(combined_texts)} ServiceNow records...")
embeddings = model.encode(combined_texts).tolist()

json_output = []
for i, (num, sd, meta) in enumerate(records):
    json_output.append({
        "id": num,
        "label": f"[{num}] {sd[:40]}..." if len(sd) > 40 else f"[{num}] {sd}",
        "embedding": embeddings[i],
        "metadata": meta
    })

# Save to backend sample_data and frontend public
backend_out = "e:/my_projects/vector_space_platform_all/vector-space-platform-main-v4-SNOW/backend/sample_data/sample_vectors.json"
frontend_out = "e:/my_projects/vector_space_platform_all/vector-space-platform-main-v4-SNOW/frontend/public/sample-data/sample_vectors.json"

with open(backend_out, "w", encoding="utf-8") as f:
    json.dump(json_output, f, indent=2)

with open(frontend_out, "w", encoding="utf-8") as f:
    json.dump(json_output, f, indent=2)

print(f"Saved {len(json_output)} ServiceNow vectors with embeddings to {backend_out} and {frontend_out}")
