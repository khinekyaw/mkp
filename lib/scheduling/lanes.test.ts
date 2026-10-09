import { describe, expect, it } from "vitest";
import { layoutLanes } from "./lanes";

const ev = (id: string, startMin: number, endMin: number) => ({ id, startMin, endMin });
const byId = <T extends { id: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.id, r]));

describe("layoutLanes", () => {
  it("gives non-overlapping events the full width", () => {
    const r = byId(layoutLanes([ev("a", 540, 570), ev("b", 570, 600)]));
    expect(r.a).toMatchObject({ lane: 0, lanes: 1 });
    expect(r.b).toMatchObject({ lane: 0, lanes: 1 });
  });

  it("splits overlapping events into lanes", () => {
    const r = byId(layoutLanes([ev("a", 540, 600), ev("b", 560, 620)]));
    expect(r.a).toMatchObject({ lane: 0, lanes: 2 });
    expect(r.b).toMatchObject({ lane: 1, lanes: 2 });
  });

  it("reuses a freed lane within the same cluster", () => {
    const r = byId(layoutLanes([ev("a", 540, 660), ev("b", 540, 570), ev("c", 580, 610)]));
    expect(r.a).toMatchObject({ lane: 0, lanes: 2 });
    expect(r.b).toMatchObject({ lane: 1, lanes: 2 });
    expect(r.c).toMatchObject({ lane: 1, lanes: 2 });
  });

  it("starts a new cluster after a gap", () => {
    const r = byId(layoutLanes([ev("a", 540, 600), ev("b", 550, 600), ev("c", 700, 730)]));
    expect(r.c).toMatchObject({ lane: 0, lanes: 1 });
  });
});
