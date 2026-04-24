import { useState, useEffect, useCallback } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'https://bfhl-backend-delta-roan.vercel.app'

/* Theme helpers*/
const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: '☀️' },
  { key: 'dark', label: 'Dark', icon: '⬛' },
  { key: 'system', label: 'System', icon: '◑' },
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
  else pillClass += 'node-pill-inner'

  return (
    <div className="tree-node">
      <div className="tree-node-row">
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
  const [isOpen, setIsOpen] = useState(true)
  const { root, tree, depth, has_cycle } = hierarchy

  return (
    <div className="hierarchy-card">
      <div className="hierarchy-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="hierarchy-root-name">
          <span className="root-node-icon">{root}</span>
          <span className="root-label">Root</span>
        </div>
        <div className="hierarchy-badges">
          {has_cycle ? (
            <>
              <span className="badge badge-cycle">CYCLE</span>
              <span className="badge badge-depth-none">no depth</span>
            </>
          ) : (
            <>
              <span className="badge badge-tree">TREE</span>
              <span className="badge badge-depth">depth: {depth}</span>
            </>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="hierarchy-body">
          {has_cycle ? (
            <div className="cycle-message">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cycle-icon">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 21v-5h5"></path>
              </svg>
              <span>Cycle detected — no tree structure available for this component.</span>
            </div>
          ) : (
            <div className="tree-root">
              <TreeNode name={root} children={tree} depth={0} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* Summary Card*/
function SummaryCard({ summary }) {
  const { total_trees, total_cycles, largest_tree_root } = summary
  return (
    <div className="summary-section fade-in delay-2">
      <div className="summary-grid">
        <div className="stat-card trees">
          <div className="stat-value">{total_trees}</div>
          <div className="stat-label">Total Trees</div>
        </div>
        <div className="stat-card cycles">
          <div className="stat-value">{total_cycles}</div>
          <div className="stat-label">Total Cycles</div>
        </div>
        <div className="stat-card largest">
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
    { key: 'user_id', val: data.user_id },
    { key: 'email_id', val: data.email_id },
    { key: 'roll_number', val: data.college_roll_number },
  ]
  return (
    <div className="identity-section fade-in">
      <div className="identity-row">
        {fields.map(f => (
          <div key={f.key} className="id-chip-wrapper">
            <span className="id-chip-label">{f.key}</span>
            <span className="id-chip">{f.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Tag Blocks (invalid + duplicate)*/
function TagSection({ invalidEntries, duplicateEdges }) {
  return (
    <div className="tags-section fade-in delay-3">
      <div className="tags-grid">
        <div className="tag-card">
          <div className="tag-header">Invalid Entries</div>
          {invalidEntries.length === 0 ? (
            <div className="none-msg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              None
            </div>
          ) : (
            <div className="chip-list">
              {invalidEntries.map((e, i) => (
                <span key={i} className="chip chip-invalid">{String(e)}</span>
              ))}
            </div>
          )}
        </div>
        <div className="tag-card">
          <div className="tag-header">Duplicate Edges</div>
          {duplicateEdges.length === 0 ? (
            <div className="none-msg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              None
            </div>
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
        body: JSON.stringify({ data: edges }),
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
      <div className="bg-mesh">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
      </div>
      <div className="container">
        {/* ── Header ── */}
        <header className="app-header">
          <div className="header-left">
            <h1 className="header-title">BFHL<span className="header-badge">NODE ANALYZER</span></h1>
            <p className="header-subtitle">Bajaj Finserv · Round 1</p>
          </div>
          <div className="theme-toggle-group" role="group" aria-label="Theme selection">
            <div className="theme-toggle-slider" data-active={themeChoice}></div>
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.key}
                id={`theme-btn-${opt.key}`}
                className={`theme-btn${themeChoice === opt.key ? ' active' : ''}`}
                onClick={() => handleThemeChange(opt.key)}
                aria-pressed={themeChoice === opt.key}
                title={`Switch to ${opt.label} theme`}
              >
                <span className="theme-btn-icon">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Input Card ── */}
        <div className="input-card">
          <div className="input-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            Edge Input
          </div>
          <div className="input-section">
            <div className="textarea-wrapper">
              <textarea
                id="edge-input"
                className="edge-textarea"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="A->B, A->C, B->D, X->Y, Y->Z, Z->X"
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
              {loading ? (
                <span className="loading-dots">Analyzing<span>.</span><span>.</span><span>.</span></span>
              ) : (
                'Analyze Graph'
              )}
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="error-box" role="alert">
            <span className="error-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <section className="results-area" aria-label="Analysis results">
            {/* Identity */}
            <IdentityCard data={result} />

            {/* Hierarchies */}
            <div className="hierarchies-section fade-in delay-1">
              <div className="section-label">Hierarchies</div>
              {result.hierarchies.length === 0 ? (
                <div className="empty-state">No valid edges — nothing to display.</div>
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
