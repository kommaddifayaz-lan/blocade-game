(function (g) {
  'use strict';
  const dist = (s, p) => { const path = Rules.shortestPath(s, p); return path ? path.length - 1 : 99; };

  // Legal pawn moves plus walls placed near the opponent's shortest path.
  function candidates(s) {
    const p = s.turn, out = [];
    Movement.getMoves(s, p).forEach(to => out.push({ type: 'move', to }));
    if (s.wallsLeft[p] > 0) {
      const path = Rules.shortestPath(s, 1 - p) || [], seen = new Set();
      path.slice(0, 7).forEach(cell => {
        for (let dr = -1; dr <= 0; dr++) for (let dc = -1; dc <= 0; dc++) for (const o of ['h', 'v']) {
          const r = cell.r + dr, c = cell.c + dc, k = Rules.wkey(o, r, c);
          if (seen.has(k)) continue;
          seen.add(k);
          if (Rules.canPlaceWall(s, p, o, r, c).ok) out.push({ type: 'wall', o, r, c });
        }
      });
    }
    return out;
  }
  const apply = (s, a) => (a.type === 'move' ? Movement.move(s, a.to) : Wall.place(s, a.o, a.r, a.c));
  const evaluate = (s, p) => dist(s, 1 - p) - dist(s, p) + 0.15 * (s.wallsLeft[p] - s.wallsLeft[1 - p]);

  function search(s, depth, noise) {
    const p = s.turn;
    let best = null, bv = -Infinity;
    for (const a of candidates(s)) {
      const c = Rules.clone(s);
      apply(c, a);
      let v;
      if (c.winner === p) v = 1000 + depth;
      else if (depth > 1) v = -search(c, depth - 1, 0).value;
      else v = evaluate(c, p);
      v += Math.random() * noise + Math.random() * 0.01;
      if (v > bv) { bv = v; best = a; }
    }
    return best ? { value: bv, action: best } : { value: -50, action: null };
  }

  const LEVELS = { easy: { depth: 1, noise: 2.5 }, medium: { depth: 1, noise: 0.3 }, hard: { depth: 2, noise: 0 } };
  g.AI = { choose(state, level) { const L = LEVELS[level] || LEVELS.medium; return search(state, L.depth, L.noise).action; } };
})(typeof window !== 'undefined' ? window : globalThis);
