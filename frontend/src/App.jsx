import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/* Theme helpers*/
const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: '☀️' },
  { key: 'dark', label: 'Dark', icon: '🌙' },
  { key: 'system', label: 'System', icon: '💻' },
]

function resolveTheme(choice) {
  if (choice === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return choice
}

/* Recursive Tree Renderer*/
function TreeNode({ name, children, depth = 0 }) {
  const isRoot = depth === 0
  const hasChildren = children && Object.keys(children).length > 0

  let pillClass = 'node-pill '
  if (isRoot) pillClass += 'node-pill-root'
  else if (!hasChildren) pillClass += 'node-pill-leaf'
  else pillClass += 'node-pill-inner'

  return (
    <div className="tree-node" style={{ marginBottom: hasChildren ? 0 : 0 }}>
      <div className="tree-node-row" style={{ marginBottom: hasChildren ? 6 : 4 }}>
        <span className={pillClass} title={`Node ${name}`}>{name}</span>
      </div>
      {hasChildren && (
        <div className="tree-children">
          {Object.entries(children).map(([child, grandchildren]) => (
            <TreeNode
              key={child}
              name={child}
              children={grandchildren}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* Hierarchy Card*/
function HierarchyCard({ hierarchy }) {
  const { root, tree, depth, has_cycle } = hierarchy

  return (
    <div className="hierarchy-card">
      <div className="hierarchy-header">
        <div className="hierarchy-root-name">
          <span className="root-node-icon">{root}</span>
          <span>Root: <strong>{root}</strong></span>
        </div>
        <div className="hierarchy-badges">
          {has_cycle ? (
            <span className="badge badge-cycle">🔄 Cycle</span>
          ) : (
            <>
              <span className="badge badge-tree">🌲 Tree</span>
              <span className="badge badge-depth">Depth {depth}</span>
            </>
          )}
        </div>
      </div>
      <div className="hierarchy-body">
        {has_cycle ? (
          <div className="cycle-message">
            <span>⚠️</span>
            <span>Cycle detected — no tree structure available for this component.</span>
          </div>
        ) : (
          <div className="tree-root">
            <TreeNode name={root} children={tree} depth={0} />
          </div>
        )}
      </div>
    </div>
  )
}

/* Summary Card*/
function SummaryCard({ summary }) {
  const { total_trees, total_cycles, largest_tree_root } = summary
  return (
    <div className="card">
      <p className="card-label">Summary</p>
      <div className="summary-grid">
        <div className="stat-box trees">
          <div className="stat-value">{total_trees}</div>
          <div className="stat-label">Total Trees 🌲</div>
        </div>
        <div className="stat-box cycles">
          <div className="stat-value">{total_cycles}</div>
          <div className="stat-label">Total Cycles 🔄</div>
        </div>
        <div className="stat-box largest">
          <div className="stat-value">{largest_tree_root ?? '—'}</div>
          <div className="stat-label">Largest Tree Root</div>
        </div>
      </div>
    </div>
  )
}

/* Identity Chips*/
function IdentityCard({ data }) {
  const fields = [
    { key: 'User ID', val: data.user_id },
    { key: 'Email', val: data.email_id },
    { key: 'Roll No.', val: data.college_roll_number },
  ]
  return (
    <div className="card">
      <p className="card-label">Identity</p>
      <div className="identity-card">
        {fields.map(f => (
          <span key={f.key} className="id-chip">
            <span className="id-chip-key">{f.key}</span>
            {f.val}
          </span>
        ))}
      </div>
    </div>
  )
}

/* Tag Blocks (invalid + duplicate)*/
function TagSection({ invalidEntries, duplicateEdges }) {
  return (
    <div className="card">
      <div className="tag-row">
        <div>
          <div className="tag-block-title">⛔ Invalid Entries</div>
          {invalidEntries.length === 0 ? (
            <div className="none-msg"><span>✅</span> None</div>
          ) : (
            <div className="chip-list">
              {invalidEntries.map((e, i) => (
                <span key={i} className="chip chip-invalid">{String(e)}</span>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="tag-block-title">🔁 Duplicate Edges</div>
          {duplicateEdges.length === 0 ? (
            <div className="none-msg"><span>✅</span> None</div>
          ) : (
            <div className="chip-list">
              {duplicateEdges.map((e, i) => (
                <span key={i} className="chip chip-duplicate">{String(e)}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Main App*/
export default function App() {
  const [themeChoice, setThemeChoice] = useState(
    () => localStorage.getItem('bfhl-theme') || 'system'
  )
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Apply theme to <html> data attribute
  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute('data-theme', resolveTheme(themeChoice))
    }
    apply()

    if (themeChoice === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [themeChoice])

  const handleThemeChange = (key) => {
    setThemeChoice(key)
    localStorage.setItem('bfhl-theme', key)
  }

  const parseEdges = (text) => {
    return text
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  const handleAnalyze = useCallback(async () => {
    const edges = parseEdges(inputText)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_URL}/bfhl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edges }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to reach the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [inputText])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAnalyze()
    }
  }

  return (
    <div className="app-wrapper">
      <div className="container">
        {/* ── Header ── */}
        <header className="app-header">
          <div className="header-left">
            <h1 className="header-title">BFHL Node Analyzer</h1>
            <p className="header-subtitle">Bajaj Finserv Health Ltd — Round 1</p>
          </div>
          <div className="theme-toggle-group" role="group" aria-label="Theme selection">
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.key}
                id={`theme-btn-${opt.key}`}
                className={`theme-btn${themeChoice === opt.key ? ' active' : ''}`}
                onClick={() => handleThemeChange(opt.key)}
                aria-pressed={themeChoice === opt.key}
                title={`Switch to ${opt.label} theme`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* ── Input Card ── */}
        <div className="card">
          <label className="card-label" htmlFor="edge-input">Enter Node Edges</label>
          <div className="input-section">
            <div className="textarea-wrapper">
              <textarea
                id="edge-input"
                className="edge-textarea"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="A->B, A->C, B->D, X->Y, Y->Z, Z->X"
                rows={5}
                aria-label="Enter node edges separated by commas or newlines"
                spellCheck={false}
              />
            </div>
            <p className="hint-text">
              Separate edges with commas or newlines. Format: <strong>A-&gt;B</strong> (single uppercase letters only). Press <kbd>Ctrl+Enter</kbd> to analyze.
            </p>
            <button
              id="analyze-btn"
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={loading || !inputText.trim()}
              aria-busy={loading}
            >
              <span className="btn-inner">
                {loading && <span className="spinner" aria-hidden="true" />}
                {loading ? 'Analyzing…' : '⚡ Analyze Graph'}
              </span>
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="error-box" role="alert">
            <span className="error-icon">⛔</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <section className="results-area" aria-label="Analysis results">
            {/* Identity */}
            <IdentityCard data={result} />

            {/* Hierarchies */}
            <div className="card">
              <p className="card-label">Hierarchies ({result.hierarchies.length})</p>
              {result.hierarchies.length === 0 ? (
                <div className="empty-hierarchies">No valid edges — nothing to display.</div>
              ) : (
                <div className="hierarchy-list">
                  {result.hierarchies.map((h, i) => (
                    <HierarchyCard key={`${h.root}-${i}`} hierarchy={h} />
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <SummaryCard summary={result.summary} />

            {/* Tags */}
            <TagSection
              invalidEntries={result.invalid_entries}
              duplicateEdges={result.duplicate_edges}
            />
          </section>
        )}
      </div>
    </div>
  )
}
