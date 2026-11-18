(function (g) {
  'use strict';
  // Every rule is configurable through DEFAULTS (or the options passed to createState).
  const DEFAULTS = { size: 9, wallsPerPlayer: 10, allowJump: true, allowDiagonal: true };
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const wkey = (o, r, c) => o + r + ',' + c;
  const hasWall = (s, o, r, c) => s.wallSet.has(wkey(o, r, c));
  const inBounds = (s, r, c) => r >= 0 && c >= 0 && r < s.size && c < s.size;
  const ok = () => ({ ok: true });
  const fail = reason => ({ ok: false, reason });

  // A wall "h" at (r,c) sits between rows r and r+1 across columns c and c+1.
  // A wall "v" at (r,c) sits between columns c and c+1 across rows r and r+1.
  function blocked(s, r, c, dr, dc) {
    if (dr === 1) return hasWall(s, 'h', r, c) || hasWall(s, 'h', r, c - 1);
    if (dr === -1) return hasWall(s, 'h', r - 1, c) || hasWall(s, 'h', r - 1, c - 1);
    if (dc === 1) return hasWall(s, 'v', r, c) || hasWall(s, 'v', r - 1, c);
    return hasWall(s, 'v', r, c - 1) || hasWall(s, 'v', r - 1, c - 1);
  }
  const canStep = (s, r, c, dr, dc) => inBounds(s, r + dr, c + dc) && !blocked(s, r, c, dr, dc);

  function createState(cfg) {
    cfg = Object.assign({}, DEFAULTS, cfg);
    const mid = Math.floor(cfg.size / 2);
    return {
      size: cfg.size, cfg,
      pawns: [{ r: cfg.size - 1, c: mid }, { r: 0, c: mid }],
      wallsLeft: [cfg.wallsPerPlayer, cfg.wallsPerPlayer],
      walls: [], wallSet: new Set(), turn: 0, winner: null, moveCount: 0
    };
  }
  function clone(s) {
    return Object.assign({}, s, {
      pawns: s.pawns.map(p => ({ r: p.r, c: p.c })),
      wallsLeft: s.wallsLeft.slice(),
      walls: s.walls.map(w => Object.assign({}, w)),
      wallSet: new Set(s.wallSet)
    });
  }
  const goalRow = (s, p) => (p === 0 ? 0 : s.size - 1);

  // BFS over cells, ignoring pawns. Returns the shortest path (array of cells) or null.
  function shortestPath(s, p) {
    const n = s.size, goal = goalRow(s, p), start = s.pawns[p];
    const prev = new Int16Array(n * n).fill(-2);
    const q = [start.r * n + start.c];
    prev[q[0]] = -1;
    for (let i = 0; i < q.length; i++) {
      const cur = q[i], r = (cur / n) | 0, c = cur % n;
      if (r === goal) {
        const path = [];
        for (let k = cur; k !== -1; k = prev[k]) path.push({ r: (k / n) | 0, c: k % n });
        return path.reverse();
      }
      for (const [dr, dc] of DIRS) {
        if (!canStep(s, r, c, dr, dc)) continue;
        const k = (r + dr) * n + c + dc;
        if (prev[k] === -2) { prev[k] = cur; q.push(k); }
      }
    }
    return null;
  }
  const hasPath = (s, p) => shortestPath(s, p) !== null;

  function validMoves(s, p) {
    const me = s.pawns[p], op = s.pawns[1 - p], out = [];
    for (const [dr, dc] of DIRS) {
      if (!canStep(s, me.r, me.c, dr, dc)) continue;
      const n = { r: me.r + dr, c: me.c + dc };
      if (n.r !== op.r || n.c !== op.c) { out.push(n); continue; }
      if (canStep(s, n.r, n.c, dr, dc)) {
        if (s.cfg.allowJump) out.push({ r: n.r + dr, c: n.c + dc });
      } else if (s.cfg.allowDiagonal) {
        for (const [er, ec] of DIRS) {
          if (er * dr + ec * dc !== 0) continue; // perpendicular only
          if (canStep(s, n.r, n.c, er, ec)) out.push({ r: n.r + er, c: n.c + ec });
        }
      }
    }
    return out;
  }

  function validateTurn(s, p) {
    if (s.winner !== null) return fail('The game is over.');
    if (p !== s.turn) return fail('It is not your turn.');
    return ok();
  }
  function validateMove(s, p, to) {
    const t = validateTurn(s, p);
    if (!t.ok) return t;
    if (!validMoves(s, p).some(m => m.r === to.r && m.c === to.c)) return fail('That square is not reachable.');
    return ok();
  }
  function canPlaceWall(s, p, o, r, c) {
    const t = validateTurn(s, p);
    if (!t.ok) return t;
    if (s.wallsLeft[p] <= 0) return fail('No walls left.');
    if (o !== 'h' && o !== 'v') return fail('Unknown wall type.');
    if (r < 0 || c < 0 || r > s.size - 2 || c > s.size - 2) return fail('Wall must stay on the board.');
    const other = o === 'h' ? 'v' : 'h';
    if (hasWall(s, o, r, c)) return fail('A wall is already there.');
    if (hasWall(s, other, r, c)) return fail('Walls cannot cross.');
    if (o === 'h' && (hasWall(s, 'h', r, c - 1) || hasWall(s, 'h', r, c + 1))) return fail('Walls cannot overlap.');
    if (o === 'v' && (hasWall(s, 'v', r - 1, c) || hasWall(s, 'v', r + 1, c))) return fail('Walls cannot overlap.');
    const k = wkey(o, r, c);
    s.wallSet.add(k);
    const both = hasPath(s, 0) && hasPath(s, 1);
    s.wallSet.delete(k);
    return both ? ok() : fail('That wall would trap a pawn: every player needs a path to the goal.');
  }
  const checkWin = (s, p) => s.pawns[p].r === goalRow(s, p);
  function endTurn(s) {
    s.moveCount++;
    if (checkWin(s, s.turn)) s.winner = s.turn; else s.turn = 1 - s.turn;
  }
  function validateState(s) {
    const errors = [];
    s.pawns.forEach((p, i) => { if (!inBounds(s, p.r, p.c)) errors.push('Pawn ' + i + ' is off the board.'); });
    if (s.pawns[0].r === s.pawns[1].r && s.pawns[0].c === s.pawns[1].c) errors.push('Pawns share a square.');
    s.wallsLeft.forEach((n, i) => { if (n < 0) errors.push('Player ' + i + ' has negative walls.'); });
    if (s.walls.length !== s.wallSet.size) errors.push('Wall list and lookup disagree.');
    if (s.walls.length + s.wallsLeft[0] + s.wallsLeft[1] !== 2 * s.cfg.wallsPerPlayer) errors.push('Wall count mismatch.');
    if (!hasPath(s, 0) || !hasPath(s, 1)) errors.push('A pawn has no path to its goal.');
    return { ok: errors.length === 0, errors };
  }

  g.Rules = { DEFAULTS, DIRS, wkey, inBounds, blocked, canStep, createState, clone, goalRow, shortestPath, hasPath,
    validMoves, validateTurn, validateMove, canPlaceWall, checkWin, endTurn, validateState };
})(typeof window !== 'undefined' ? window : globalThis);
