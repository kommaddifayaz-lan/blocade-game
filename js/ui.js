(function (g) {
  'use strict';
  const $ = id => document.getElementById(id);
  const WALL_DEFAULTS = { 5: 5, 7: 7, 9: 10, 11: 14 };

  const UI = {
    game: null, mode: 'move', selected: false, preview: null, locked: false, sound: true, ctx: null,

    init(game) {
      this.game = game;
      this.root = $('boardRoot');
      game.on(t => this.onGame(t));
      this.root.addEventListener('click', e => this.onClick(e));
      this.root.addEventListener('pointermove', e => this.onHover(e));
      this.root.addEventListener('pointerleave', () => { if (!this.locked && this.preview) { this.preview = null; this.refresh(); } });
      $('modes').addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.setMode(b.dataset.mode); });
      $('confirmBtn').addEventListener('click', () => this.confirm());
      $('cancelBtn').addEventListener('click', () => this.cancel());
      $('undoBtn').addEventListener('click', () => { if (!game.undo()) this.say('Nothing to undo.'); });
      $('soundBtn').addEventListener('click', () => { this.sound = !this.sound; $('soundBtn').textContent = this.sound ? 'Sound on' : 'Sound off'; });
      $('newBtn').addEventListener('click', () => game.start(this.readSettings()));
      $('modalBtn').addEventListener('click', () => game.start(this.readSettings()));
      $('optSize').addEventListener('change', e => { $('optWalls').value = WALL_DEFAULTS[e.target.value] || 10; });
      document.addEventListener('keydown', e => this.onKey(e));
    },

    readSettings() {
      return {
        size: +$('optSize').value, wallsPerPlayer: Math.max(0, +$('optWalls').value || 0),
        allowJump: $('optJump').checked, allowDiagonal: $('optDiag').checked, ai: $('optOpp').value || null
      };
    },

    canAct() { return this.game.state.winner === null && !this.game.current.isAI; },
    say(text, kind) { const m = $('message'); m.textContent = text || ''; m.className = 'message' + (kind ? ' ' + kind : ''); },

    setMode(m) {
      this.mode = m; this.preview = null; this.locked = false;
      if (m !== 'move') this.selected = false;
      document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
      this.say(m === 'move' ? 'Tap your pawn, then a green dot.' : 'Move over the board to preview the wall, then tap to lock it in.');
      this.refresh();
    },
    cancel() { this.preview = null; this.locked = false; this.selected = false; this.say(''); this.refresh(); },

    onGame(t) {
      const s = this.game.state;
      if (t === 'start') {
        Board.build(this.root, s.size);
        $('modal').classList.add('hidden');
        this.mode = 'move';
        document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('active', b.dataset.mode === 'move'));
        this.say('Tap your pawn, then a green dot.');
      } else this.say('');
      this.selected = false; this.preview = null; this.locked = false;
      if (t === 'move') this.beep(520);
      if (t === 'wall') this.beep(240, 0.12, 'square');
      if (t === 'win') {
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, 0.18), i * 130));
        $('modalTitle').textContent = this.game.players[s.winner].name + ' wins!';
        $('modalText').textContent = 'Reached the goal row after ' + s.moveCount + ' turns.';
        setTimeout(() => $('modal').classList.remove('hidden'), 450);
      }
      this.refresh();
    },

    previewInfo() {
      const p = this.preview, s = this.game.state;
      if (!p) return null;
      const v = Rules.canPlaceWall(s, s.turn, p.o, p.r, p.c);
      return Object.assign({ ok: v.ok, reason: v.reason }, p);
    },

    refresh() {
      const gm = this.game, s = gm.state, act = this.canAct();
      const pv = this.previewInfo();
      Board.render(s, { moves: this.selected && act && this.mode === 'move' ? gm.moves() : [], selected: this.selected, preview: pv, wallMode: this.mode !== 'move' });
      const cur = gm.current;
      $('status').textContent = s.winner !== null ? cur.name + ' wins!' : cur.name + (cur.isAI ? ' is thinking…' : "'s turn");
      $('status').style.color = cur.color;
      $('players').innerHTML = gm.players.map(p => {
        const n = s.wallsLeft[p.id];
        return '<div class="pcard' + (s.turn === p.id && s.winner === null ? ' active' : '') + '"><span class="dot" style="background:' + p.color + '"></span>' +
          '<div class="pinfo"><b>' + p.name + (p.isAI ? ' (AI)' : '') + '</b><span class="bars">' + '<i></i>'.repeat(n) + '</span></div>' +
          '<span class="count" title="Walls left">' + n + '</span></div>';
      }).join('');
      $('confirmBtn').disabled = !(pv && pv.ok && act);
      $('cancelBtn').disabled = !(this.preview || this.selected);
      $('undoBtn').disabled = !gm.history.length;
      if (pv && !pv.ok && this.locked) this.say(pv.reason, 'err');
    },

    onClick(e) {
      if (!this.canAct()) return;
      const s = this.game.state;
      if (this.mode === 'move') {
        const pawn = e.target.closest('.pawn');
        if (pawn) {
          if (+pawn.dataset.p === s.turn) { this.selected = !this.selected; this.say(this.selected ? 'Choose a highlighted square.' : ''); }
          else this.say("That is your opponent's pawn.");
          return this.refresh();
        }
        const cell = e.target.closest('.cell');
        if (!cell) return;
        if (!this.selected) { this.say('Select your pawn first.'); return; }
        const res = this.game.move({ r: +cell.dataset.r, c: +cell.dataset.c });
        if (!res.ok) { this.say(res.reason, 'err'); this.beep(120, 0.15, 'sawtooth'); }
      } else {
        const slot = Board.slotAt(e.clientX, e.clientY, this.mode), p = this.preview;
        if (this.locked && p && p.o === slot.o && p.r === slot.r && p.c === slot.c) return this.confirm();
        this.preview = slot; this.locked = true; this.say('');
        this.refresh();
      }
    },
    onHover(e) {
      if (e.pointerType !== 'mouse' || this.mode === 'move' || this.locked || !this.canAct()) return;
      const slot = Board.slotAt(e.clientX, e.clientY, this.mode), p = this.preview;
      if (p && p.o === slot.o && p.r === slot.r && p.c === slot.c) return;
      this.preview = slot; this.refresh();
    },
    confirm() {
      const p = this.preview;
      if (!p || !this.canAct()) return;
      const res = this.game.wall(p.o, p.r, p.c);
      if (!res.ok) { this.say(res.reason, 'err'); this.beep(120, 0.15, 'sawtooth'); }
    },
    onKey(e) {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'w') this.setMode(this.mode === 'move' ? 'h' : 'move');
      else if (k === 'r' && this.mode !== 'move') this.setMode(this.mode === 'h' ? 'v' : 'h');
      else if (k === 'escape') this.cancel();
      else if (k === 'enter' && this.locked) this.confirm();
    },

    beep(freq, dur, type, vol) {
      if (!this.sound) return;
      dur = dur || 0.09;
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const o = this.ctx.createOscillator(), a = this.ctx.createGain(), t = this.ctx.currentTime;
        o.type = type || 'sine'; o.frequency.value = freq;
        a.gain.setValueAtTime(vol || 0.06, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(a); a.connect(this.ctx.destination); o.start(t); o.stop(t + dur);
      } catch (err) { /* audio unavailable */ }
    }
  };
  g.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
