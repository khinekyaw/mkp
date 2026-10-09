/**
 * Side-by-side layout for overlapping events in one calendar column, like
 * Google Calendar: events that overlap share the column width; each gets the
 * first free lane, and every event in a cluster of overlaps uses the same
 * lane count so widths line up.
 */
export type Laned<T> = T & { lane: number; lanes: number };

export function layoutLanes<T extends { startMin: number; endMin: number }>(events: T[]): Laned<T>[] {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out: Laned<T>[] = [];
  let cluster: Laned<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    for (const e of cluster) e.lanes = laneEnds.length;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const e of sorted) {
    if (e.startMin >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= e.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e.endMin);
    } else {
      laneEnds[lane] = e.endMin;
    }
    cluster.push({ ...e, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, e.endMin);
  }
  flush();
  return out;
}
