const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const USER_ID = 'jainishjain_11012005';
const EMAIL_ID = 'jj5748@srmist.edu.in';
const COLLEGE_ROLL_NUMBER = 'RA2311003010805';

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

//POST /bfhl 
app.post('/bfhl', (req, res) => {
  const { edges = [] } = req.body;

  const invalid_entries = [];
  const duplicate_edges = [];

  //Step 1: Validate
  const EDGE_REGEX = /^[A-Z]->[A-Z]$/;
  const validRaw = []; // entries that pass regex + self-loop check

  for (const entry of edges) {
    const trimmed = typeof entry === 'string' ? entry.trim() : '';
    if (!EDGE_REGEX.test(trimmed)) {
      invalid_entries.push(entry);
      continue;
    }
    const [parent, child] = [trimmed[0], trimmed[3]];
    if (parent === child) {
      invalid_entries.push(entry);
      continue;
    }
    validRaw.push({ parent, child, raw: trimmed });
  }

  //Step 2: Deduplicate
  const seenPairs = new Set();
  const dedupedEdges = []; // valid, unique pair edges

  for (const edge of validRaw) {
    const key = `${edge.parent}->${edge.child}`;
    if (seenPairs.has(key)) {
      // Only add to duplicate_edges once per pair
      if (!duplicate_edges.includes(edge.raw)) {
        duplicate_edges.push(edge.raw);
      }
    } else {
      seenPairs.add(key);
      dedupedEdges.push(edge);
    }
  }

  //Step 3 + 4: Multi-parent rule + Build adjacency map
  const childParentMap = new Map(); // child → assigned parent
  const adjacency = new Map();      // parent → [children]
  const allNodes = new Set();

  for (const { parent, child } of dedupedEdges) {
    allNodes.add(parent);
    allNodes.add(child);

    if (childParentMap.has(child)) {
      // Silently discard multi-parent edge (NOT added to duplicates)
      continue;
    }

    childParentMap.set(child, parent);

    if (!adjacency.has(parent)) adjacency.set(parent, []);
    adjacency.get(parent).push(child);
  }

  //Step 5: Union-Find for connected components
  const parent = {};
  const find = (x) => {
    if (parent[x] === undefined) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (const node of allNodes) find(node);

  // Union nodes that are connected via the accepted edges
  for (const [p, children] of adjacency) {
    for (const c of children) union(p, c);
  }

  // Group nodes by component root
  const components = new Map();
  for (const node of allNodes) {
    const root = find(node);
    if (!components.has(root)) components.set(root, new Set());
    components.get(root).add(node);
  }

  //Step 6: Per-component processing
  const hierarchies = [];

  for (const [, componentNodes] of components) {
    const nodeList = [...componentNodes].sort();

    // Collect edges that belong to this component
    const compEdges = new Map(); // parent → [children] within component
    const childrenSet = new Set();

    for (const node of nodeList) {
      if (adjacency.has(node)) {
        const kids = adjacency.get(node).filter(c => componentNodes.has(c));
        if (kids.length > 0) {
          compEdges.set(node, kids);
          for (const k of kids) childrenSet.add(k);
        }
      }
    }

    // Find root: node never appearing as a child within this component
    const candidates = nodeList.filter(n => !childrenSet.has(n));
    const treeRoot = candidates.length > 0
      ? candidates.sort()[0]
      : nodeList[0]; // lexicographically smallest for pure cycle

    // Cycle detection via DFS
    const detectCycle = (start) => {
      const visited = new Set();
      const stack = new Set();
      const dfs = (node) => {
        visited.add(node);
        stack.add(node);
        const children = compEdges.get(node) || [];
        for (const child of children) {
          if (!visited.has(child)) {
            if (dfs(child)) return true;
          } else if (stack.has(child)) {
            return true;
          }
        }
        stack.delete(node);
        return false;
      };
      // Run dfs from every node to catch disconnected sub-cycles
      for (const node of nodeList) {
        if (!visited.has(node)) {
          if (dfs(node)) return true;
        }
      }
      return false;
    };

    const hasCycle = detectCycle(treeRoot);

    if (hasCycle) {
      hierarchies.push({ root: treeRoot, tree: {}, has_cycle: true });
    } else {
      // Build nested tree recursively
      const buildTree = (node) => {
        const children = compEdges.get(node) || [];
        if (children.length === 0) return {};
        const obj = {};
        for (const child of children) {
          obj[child] = buildTree(child);
        }
        return obj;
      };

      // Calculate depth (number of nodes on longest root-to-leaf path)
      const calcDepth = (node) => {
        const children = compEdges.get(node) || [];
        if (children.length === 0) return 1;
        return 1 + Math.max(...children.map(calcDepth));
      };

      const tree = buildTree(treeRoot);
      const depth = calcDepth(treeRoot);
      hierarchies.push({ root: treeRoot, tree, depth });
    }
  }

  //Step 7: Summary
  const trees = hierarchies.filter(h => !h.has_cycle);
  const cycles = hierarchies.filter(h => h.has_cycle);

  const total_trees = trees.length;
  const total_cycles = cycles.length;

  let largest_tree_root = null;
  if (trees.length > 0) {
    let maxDepth = -1;
    for (const t of trees) {
      if (
        t.depth > maxDepth ||
        (t.depth === maxDepth && t.root < largest_tree_root)
      ) {
        maxDepth = t.depth;
        largest_tree_root = t.root;
      }
    }
  }

  res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root,
    },
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
