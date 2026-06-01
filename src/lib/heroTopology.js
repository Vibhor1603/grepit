export const HERO_NODES = [
  { id: "client", label: "client", tier: "edge", x: 118, y: 86, order: 0 },
  { id: "edge_cdn", label: "edge", tier: "edge", x: 300, y: 86, order: 1 },
  { id: "auth", label: "auth", tier: "core", x: 118, y: 218, order: 2 },
  { id: "api", label: "api", tier: "core", x: 300, y: 218, order: 3, primary: true },
  { id: "queue", label: "queue", tier: "core", x: 482, y: 218, order: 4 },
  { id: "cache", label: "cache", tier: "data", x: 212, y: 362, order: 5 },
  { id: "db", label: "database", tier: "data", x: 388, y: 362, order: 6, primary: true },
];

export const HERO_EDGES = [
  { from: "client", to: "edge_cdn" },
  { from: "edge_cdn", to: "api" },
  { from: "client", to: "auth" },
  { from: "auth", to: "api" },
  { from: "api", to: "queue" },
  { from: "api", to: "cache" },
  { from: "api", to: "db" },
  { from: "queue", to: "db" },
  { from: "cache", to: "db" },
];

/** Narrative flows — each has a human caption for the status strip. */
export const HERO_FLOWS = [
  {
    id: "request",
    nodes: ["client", "edge_cdn", "api", "db"],
    start: 0,
    duration: 52,
    color: "accent",
    caption: "HTTP request → edge → API → database",
    trace: "request path",
  },
  {
    id: "auth",
    nodes: ["client", "auth", "api"],
    start: 38,
    duration: 44,
    color: "accent",
    caption: "Identity verified before the handler runs",
    trace: "auth gate",
  },
  {
    id: "async",
    nodes: ["api", "queue", "db"],
    start: 78,
    duration: 50,
    color: "lime",
    caption: "Async work queued, then persisted",
    trace: "job pipeline",
  },
  {
    id: "cache",
    nodes: ["api", "cache", "db"],
    start: 118,
    duration: 48,
    color: "lime",
    caption: "Hot reads served from cache first",
    trace: "cache layer",
  },
];

export const HERO_NODE_SIZE = 72;
export const HERO_TIER_LINES = [152, 290];
export const HERO_TIER_LABELS = [
  { y: 86, label: "edge" },
  { y: 218, label: "service" },
  { y: 362, label: "data" },
];

export const BOLT_PATH =
  "M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z";

function nodeById(id, nodes) {
  return nodes.find((n) => n.id === id);
}

function nodeAnchor(node, toward, size) {
  const tx = toward.x - node.x;
  const ty = toward.y - node.y;
  const angle = Math.atan2(ty, tx);
  const half = size / 2 + 2;
  const dist = Math.min(
    half / (Math.abs(Math.cos(angle)) || 1e-6),
    half / (Math.abs(Math.sin(angle)) || 1e-6),
  );
  return { x: node.x + Math.cos(angle) * dist, y: node.y + Math.sin(angle) * dist };
}

export function buildRoutedPoints(nodeIds, nodes = HERO_NODES, size = HERO_NODE_SIZE) {
  const pts = nodeIds.map((id) => nodeById(id, nodes)).filter(Boolean);
  if (pts.length < 2) return [];
  const points = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const start = nodeAnchor(pts[i], pts[i + 1], size);
    const end = nodeAnchor(pts[i + 1], pts[i], size);
    if (i === 0) points.push(start);
    points.push(end);
    if (i < pts.length - 2) {
      points.push(nodeAnchor(pts[i + 1], pts[i + 2], size));
    }
  }
  return points;
}

export function edgeSegment(fromId, toId, nodes = HERO_NODES, size = HERO_NODE_SIZE) {
  const a = nodeById(fromId, nodes);
  const b = nodeById(toId, nodes);
  if (!a || !b) return null;
  return {
    x1: nodeAnchor(a, b, size).x,
    y1: nodeAnchor(a, b, size).y,
    x2: nodeAnchor(b, a, size).x,
    y2: nodeAnchor(b, a, size).y,
    fromTier: a.tier,
    toTier: b.tier,
  };
}

export function getPointOnPolyline(points, t) {
  if (points.length < 2) return { x: points[0]?.x ?? 0, y: points[0]?.y ?? 0, angle: 0 };

  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.hypot(dx, dy);
    segments.push({ from: points[i], to: points[i + 1], len, dx, dy });
    total += len;
  }

  let dist = Math.max(0, Math.min(1, t)) * total;
  for (const seg of segments) {
    if (dist <= seg.len || seg === segments[segments.length - 1]) {
      const ratio = seg.len === 0 ? 0 : dist / seg.len;
      return {
        x: seg.from.x + seg.dx * ratio,
        y: seg.from.y + seg.dy * ratio,
        angle: (Math.atan2(seg.dy, seg.dx) * 180) / Math.PI,
      };
    }
    dist -= seg.len;
  }

  const last = points[points.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

export function nearestNodeId(point, nodes = HERO_NODES) {
  let best = nodes[0]?.id;
  let bestDist = Infinity;
  for (const n of nodes) {
    const d = Math.hypot(n.x - point.x, n.y - point.y);
    if (d < bestDist) {
      bestDist = d;
      best = n.id;
    }
  }
  return best;
}

export function activeEdgeKey(points, t) {
  if (points.length < 2) return null;
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segments.push({ i, len });
    total += len;
  }
  let dist = Math.max(0, Math.min(1, t)) * total;
  for (const seg of segments) {
    if (dist <= seg.len) return seg.i;
    dist -= seg.len;
  }
  return segments[segments.length - 1]?.i ?? 0;
}
