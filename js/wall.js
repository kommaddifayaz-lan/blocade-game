(function (g) {
  'use strict';
  const Wall = {
    place(state, o, r, c) {
      const v = Rules.canPlaceWall(state, state.turn, o, r, c);
      if (!v.ok) return v;
      state.walls.push({ o, r, c, owner: state.turn });
      state.wallSet.add(Rules.wkey(o, r, c));
      state.wallsLeft[state.turn]--;
      Rules.endTurn(state);
      return { ok: true };
    },
    // Every legal wall for the player whose turn it is.
    allValid(state) {
      const out = [];
      for (let r = 0; r < state.size - 1; r++)
        for (let c = 0; c < state.size - 1; c++)
          for (const o of ['h', 'v'])
            if (Rules.canPlaceWall(state, state.turn, o, r, c).ok) out.push({ o, r, c });
      return out;
    }
  };
  g.Wall = Wall;
})(typeof window !== 'undefined' ? window : globalThis);
