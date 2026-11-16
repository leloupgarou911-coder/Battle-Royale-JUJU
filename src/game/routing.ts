import { haversineDistance } from "./movement.ts";

export type RoadFeature = {
  geometry?: { type?: string; coordinates?: unknown };
};

type Coordinate = [number, number];
type Edge = { to: string; cost: number };

const keyOf = ([lng, lat]: Coordinate): string => `${lng.toFixed(5)},${lat.toFixed(5)}`;

function lineParts(feature: RoadFeature): Coordinate[][] {
  const geometry = feature.geometry;
  if (!geometry || !geometry.coordinates) return [];
  const raw = geometry.type === "LineString"
    ? [geometry.coordinates]
    : geometry.type === "MultiLineString" ? geometry.coordinates as unknown[] : [];
  return raw.map((part) => Array.isArray(part)
    ? part.filter((point): point is Coordinate => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 85.051129).map((point) => [point[0], point[1]])
    : []).filter((line) => line.length >= 2);
}

function nearestNode(nodes: Map<string, Coordinate>, point: Coordinate): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const [key, coordinate] of nodes) {
    const distance = haversineDistance({ lng: point[0], lat: point[1] }, { lng: coordinate[0], lat: coordinate[1] });
    if (distance < bestDistance) { bestDistance = distance; best = key; }
  }
  return bestDistance <= 1800 ? best : null;
}

/** Finds a shortest path along currently loaded OSM road segments. Returns null when local coverage is insufficient. */
export function findRoadRoute(features: RoadFeature[], start: Coordinate, end: Coordinate, maxSegments = 4500): Coordinate[] | null {
  if (!Array.isArray(features) || features.length === 0) return null;
  const nodes = new Map<string, Coordinate>();
  const graph = new Map<string, Edge[]>();
  let segments = 0;
  const addEdge = (from: Coordinate, to: Coordinate): void => {
    if (segments >= maxSegments) return;
    const a = keyOf(from), b = keyOf(to);
    if (a === b) return;
    nodes.set(a, from); nodes.set(b, to);
    const cost = haversineDistance({ lng: from[0], lat: from[1] }, { lng: to[0], lat: to[1] });
    if (!Number.isFinite(cost) || cost <= 0) return;
    const fromEdges = graph.get(a) ?? []; fromEdges.push({ to: b, cost }); graph.set(a, fromEdges);
    const toEdges = graph.get(b) ?? []; toEdges.push({ to: a, cost }); graph.set(b, toEdges);
    segments++;
  };
  for (const feature of features) {
    for (const line of lineParts(feature)) {
      for (let i = 1; i < line.length && segments < maxSegments; i++) addEdge(line[i - 1], line[i]);
    }
    if (segments >= maxSegments) break;
  }
  const source = nearestNode(nodes, start), target = nearestNode(nodes, end);
  if (!source || !target) return null;
  const distances = new Map<string, number>([[source, 0]]);
  const previous = new Map<string, string>();
  const targetPoint = nodes.get(target)!;
  const heuristic = (key: string): number => {
    const point = nodes.get(key)!;
    return haversineDistance({ lng: point[0], lat: point[1] }, { lng: targetPoint[0], lat: targetPoint[1] });
  };
  const open: { key: string; score: number }[] = [{ key: source, score: heuristic(source) }];
  const closed = new Set<string>();
  const push = (item: { key: string; score: number }): void => {
    open.push(item);
    let index = open.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (open[parent].score <= open[index].score) break;
      [open[parent], open[index]] = [open[index], open[parent]];
      index = parent;
    }
  };
  const pop = (): { key: string; score: number } | undefined => {
    const first = open[0], last = open.pop();
    if (open.length && last) {
      open[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1, right = left + 1;
        let smallest = index;
        if (left < open.length && open[left].score < open[smallest].score) smallest = left;
        if (right < open.length && open[right].score < open[smallest].score) smallest = right;
        if (smallest === index) break;
        [open[index], open[smallest]] = [open[smallest], open[index]];
        index = smallest;
      }
    }
    return first;
  };
  while (open.length) {
    const current = pop()!.key;
    if (closed.has(current)) continue;
    if (current === target) break;
    closed.add(current);
    const currentCost = distances.get(current) ?? Infinity;
    for (const edge of graph.get(current) ?? []) {
      if (closed.has(edge.to)) continue;
      const candidate = currentCost + edge.cost;
      if (candidate < (distances.get(edge.to) ?? Infinity)) {
        distances.set(edge.to, candidate);
        previous.set(edge.to, current);
        push({ key: edge.to, score: candidate + heuristic(edge.to) });
      }
    }
  }
  if (!distances.has(target)) return null;
  const route: Coordinate[] = [];
  let cursor: string | undefined = target;
  while (cursor) {
    const coordinate = nodes.get(cursor);
    if (coordinate) route.push(coordinate);
    if (cursor === source) break;
    cursor = previous.get(cursor);
  }
  if (route.length < 2 || route[route.length - 1]?.[0] !== start[0] && route.length === 0) return null;
  route.reverse();
  route.unshift(start);
  route.push(end);
  return route;
}
