import { describe, it, expect } from "vitest";

// Test the RRF algorithm directly by reimplementing the pure function
// (the actual function is not exported, so we test the algorithm)
function reciprocalRankFusion<T>(
  lists: { items: T[]; getId: (item: T) => string }[],
  k: number = 60
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.items.forEach((item, index) => {
      const id = list.getId(item);
      const current = scores.get(id) ?? 0;
      scores.set(id, current + 1 / (k + index + 1));
    });
  }
  return scores;
}

describe("Reciprocal Rank Fusion", () => {
  it("scores items higher when they appear in multiple lists", () => {
    const scores = reciprocalRankFusion([
      { items: ["a", "b", "c"], getId: (x) => x },
      { items: ["b", "a", "d"], getId: (x) => x },
    ]);

    // "a" and "b" appear in both lists, should score higher than "c" or "d"
    expect(scores.get("a")!).toBeGreaterThan(scores.get("c")!);
    expect(scores.get("b")!).toBeGreaterThan(scores.get("d")!);
  });

  it("ranks first-place items higher than second-place", () => {
    const scores = reciprocalRankFusion([
      { items: ["a", "b"], getId: (x) => x },
    ]);

    expect(scores.get("a")!).toBeGreaterThan(scores.get("b")!);
  });

  it("returns empty map for empty lists", () => {
    const scores = reciprocalRankFusion([
      { items: [] as string[], getId: (x) => x },
    ]);

    expect(scores.size).toBe(0);
  });

  it("handles single-item lists", () => {
    const scores = reciprocalRankFusion([
      { items: ["a"], getId: (x) => x },
      { items: ["a"], getId: (x) => x },
    ]);

    // "a" appears at rank 0 in both lists: 2 * (1 / (60 + 1))
    expect(scores.get("a")!).toBeCloseTo(2 / 61, 5);
  });

  it("uses k parameter to control score dampening", () => {
    const scoresLowK = reciprocalRankFusion(
      [{ items: ["a", "b"], getId: (x) => x }],
      10
    );
    const scoresHighK = reciprocalRankFusion(
      [{ items: ["a", "b"], getId: (x) => x }],
      100
    );

    // Lower k = bigger difference between ranks
    const diffLowK = scoresLowK.get("a")! - scoresLowK.get("b")!;
    const diffHighK = scoresHighK.get("a")! - scoresHighK.get("b")!;
    expect(diffLowK).toBeGreaterThan(diffHighK);
  });

  it("works with object items and custom getId", () => {
    const items = [
      { id: "msg-1", content: "hello" },
      { id: "msg-2", content: "world" },
    ];
    const scores = reciprocalRankFusion([
      { items, getId: (item) => item.id },
    ]);

    expect(scores.has("msg-1")).toBe(true);
    expect(scores.has("msg-2")).toBe(true);
  });
});
