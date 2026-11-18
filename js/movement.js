(function (g) {
  'use strict';
  const Movement = {
    getMoves(state, p) { return Rules.validMoves(state, p === undefined ? state.turn : p); },
    move(state, to) {
      const v = Rules.validateMove(state, state.turn, to);
      if (!v.ok) return v;
      state.pawns[state.turn] = { r: to.r, c: to.c };
      Rules.endTurn(state);
      return { ok: true };
    }
  };
  g.Movement = Movement;
})(typeof window !== 'undefined' ? window : globalThis);
