# BFHL Node Analyzer

**Live Demo:** https://bfhl-node-analyzer-six.vercel.app
**API Endpoint:** https://bfhl-backend-delta-roan.vercel.app/bfhl

---

## What it does
Analyzes directed graph edges, detects hierarchical trees and cycles,
and returns structured JSON with tree depth, cycle detection, and summary stats.

---

## Tech Stack
- **Backend:** Node.js + Express — deployed on Vercel
- **Frontend:** React + Vite — deployed on Vercel
- **Styling:** Pure CSS, zero UI libraries

---

## Run Locally

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

Create `frontend/.env` with:
VITE_API_URL=http://localhost:3001

text

---

## API

### GET /
Health check — returns `{ "status": "ok" }`

### POST /bfhl
**Request:**
```json
{
  "data": ["A->B", "A->C", "B->D", "X->Y", "Y->Z", "Z->X"]
}
```

**Response:**
```json
{
  "user_id": "jainishjain_11012005",
  "email_id": "jj5748@srmist.edu.in",
  "college_roll_number": "RA2311003010805",
  "hierarchies": [
    {
      "root": "A",
      "tree": { "A": { "B": { "D": {} }, "C": {} } },
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

---

## Validation Rules
- Format must be `X->Y` (single uppercase letters only)
- Self-loops like `A->A` are invalid
- Duplicate edges tracked separately
- Multi-parent edges silently discarded
- Cycles detected via DFS

---

## Deployment
- Backend → Vercel (root dir: `backend`)
- Frontend → Vercel (root dir: `frontend`, env: `VITE_API_URL`)

---

*Built for Bajaj Finserv Health Ltd — SRM Full Stack Engineering Challenge Round 1*
