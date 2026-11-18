(function (g) {
  'use strict';
  class Game {
    constructor() { this.listeners = []; this.history = []; this.timer = null; this.opts = {}; }
    on(fn) { this.listeners.push(fn); }
    emit(type) { this.listeners.forEach(fn => fn(type)); }
    get current() { return this.players[this.state.turn]; }

    start(opts) {
      clearTimeout(this.timer);
      this.opts = opts || {};
      this.state = Rules.createState(this.opts);
      this.players = Player.createPair(this.opts.ai);
      this.history = [];
      this.emit('start');
      this.maybeAI();
    }
    moves() { return Movement.getMoves(this.state); }
    move(to, byAI) { return this.act(s => Movement.move(s, to), 'move', byAI); }
    wall(o, r, c, byAI) { return this.act(s => Wall.place(s, o, r, c), 'wall', byAI); }

    act(fn, type, byAI) {
      if (!byAI && this.current.isAI) return { ok: false, reason: 'Wait for the computer to move.' };
      const snap = Rules.clone(this.state);
      const res = fn(this.state);
      if (!res.ok) return res;
      this.history.push(snap);
      this.emit(this.state.winner !== null ? 'win' : type);
      this.maybeAI();
      return res;
    }
    maybeAI() {
      clearTimeout(this.timer);
      if (this.state.winner !== null || !this.current.isAI) return;
      this.timer = setTimeout(() => {
        const a = AI.choose(this.state, this.opts.ai);
        if (!a) { this.state.turn = 1 - this.state.turn; this.emit('move'); return; } // no legal action: pass
        if (a.type === 'move') this.move(a.to, true); else this.wall(a.o, a.r, a.c, true);
      }, 500);
    }
    undo() {
      if (!this.history.length) return false;
      clearTimeout(this.timer);
      this.state = this.history.pop();
      while (this.current.isAI && this.history.length) this.state = this.history.pop();
      this.emit('undo');
      this.maybeAI();
      return true;
    }
  }
  g.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
