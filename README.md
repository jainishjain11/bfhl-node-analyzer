# BFHL Node Analyzer

A full-stack tool for analyzing hierarchical node relationships and detecting cycles in directed graphs.

**Stack:** Node.js + Express (backend) · React + Vite (frontend) · Pure CSS

---

## Project Structure

```
/
├── backend/
│   ├── index.js        # Express API — all logic lives here
│   ├── package.json
│   └── render.yaml     # Render deployment config
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── App.css
├── .gitignore
└── README.md
```

---

## Running Locally

### Backend

```bash
cd backend
npm install
npm start
# Runs on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

The frontend reads the API URL from `VITE_API_URL` (defaults to `http://localhost:3001` if not set).

---

## Deployment

### Backend → Render

1. Push this repo to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Connect your repository.
4. Set **Root Directory** to `backend`.
5. Build command: `npm install` · Start command: `node index.js`.
6. Render will read `render.yaml` automatically.

### Frontend → Vercel

1. Create a new project on [vercel.com](https://vercel.com).
2. Connect your repository.
3. Set **Root Directory** to `frontend`.
4. Add environment variable: `VITE_API_URL = https://your-render-url.onrender.com`
5. Deploy.

---

## API Reference

### `GET /`

Health check.

**Response:**
```json
{ "status": "ok" }
```

---

### `POST /bfhl`

Analyzes a list of directed edges.

**Request body:**
```json
{
  "edges": ["A->B", "A->C", "B->D", "X->Y", "Y->Z", "Z->X"]
}
```

**Example response:**
```json
{
  "user_id": "jainishjain_11012005",
  "email_id": "jj5748@srmist.edu.in",
  "college_roll_number": "RA2311003010805",
  "hierarchies": [
    {
      "root": "A",
      "tree": { "B": { "D": {} }, "C": {} },
      "depth": 3
    },
    {
      "root": "X",
      "tree": {},
      "has_cycle": true
    }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```

**Validation rules applied:**
- Entries are trimmed before validation.
- Valid format: `^[A-Z]->[A-Z]$` (single uppercase letters, `->` separator).
- Self-loops (e.g. `A->A`) are invalid.
- Duplicate edges (same parent→child pair) are tracked separately.
- Multi-parent edges are silently discarded (a child can only have one parent).
- Cycles are detected via DFS; cyclic components return `has_cycle: true` with no depth.
- `largest_tree_root` uses tiebreaking by lexicographic order.
