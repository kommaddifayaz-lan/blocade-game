(function (g) {
  'use strict';
  const K = 0.18; // wall gutter width as a fraction of a cell
  const pct = v => v + '%';

  const Board = {
    el: null, n: 0, G: null, cells: [], pawns: [], sig: null,

    geo(n) { const s = 100 / (n + (n - 1) * K); return { s, g: s * K, step: s * (1 + K) }; },
    put(el, r, c) {
      el.style.left = pct(c * this.G.step); el.style.top = pct(r * this.G.step);
      el.style.width = el.style.height = pct(this.G.s);
    },
    // Wall rectangle in percent of the board.
    rect(o, r, c) {
      const G = this.G;
      return o === 'h'
        ? { l: c * G.step, t: r * G.step + G.s, w: 2 * G.s + G.g, h: G.g }
        : { l: c * G.step + G.s, t: r * G.step, w: G.g, h: 2 * G.s + G.g };
    },
    setRect(el, o, r, c) {
      const q = this.rect(o, r, c);
      el.style.left = pct(q.l); el.style.top = pct(q.t); el.style.width = pct(q.w); el.style.height = pct(q.h);
    },
    mk(cls) { const d = document.createElement('div'); d.className = cls; return d; },

    build(root, n) {
      this.n = n; this.G = this.geo(n); root.innerHTML = '';
      const b = this.el = this.mk('board'); root.appendChild(b);
      this.cells = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const e = this.mk('cell' + (r === 0 ? ' goal0' : '') + (r === n - 1 ? ' goal1' : ''));
        e.dataset.r = r; e.dataset.c = c; this.put(e, r, c); b.appendChild(e); this.cells.push(e);
      }
      this.wallLayer = this.mk('wall-layer'); b.appendChild(this.wallLayer);
      this.previewEl = this.mk('wall preview'); b.appendChild(this.previewEl);
      this.pawns = [0, 1].map(i => {
        const p = this.mk('pawn p' + i); p.dataset.p = i; p.appendChild(this.mk('disc'));
        b.appendChild(p); return p;
      });
      this.sig = null;
      return b;
    },

    // ui = { moves:[{r,c}], selected:bool, preview:{o,r,c,ok}|null, wallMode:bool }
    render(s, ui) {
      const mv = new Set(ui.moves.map(m => m.r * s.size + m.c));
      this.cells.forEach((el, i) => el.classList.toggle('target', mv.has(i)));
      this.pawns.forEach((el, i) => {
        this.put(el, s.pawns[i].r, s.pawns[i].c);
        el.classList.toggle('active', s.winner === null && s.turn === i);
        el.classList.toggle('selected', ui.selected && s.turn === i);
      });
      const sig = s.walls.map(w => w.o + w.r + w.c + w.owner).join('|');
      if (sig !== this.sig) {
        this.sig = sig; this.wallLayer.innerHTML = '';
        s.walls.forEach(w => { const e = this.mk('wall w' + w.owner); this.setRect(e, w.o, w.r, w.c); this.wallLayer.appendChild(e); });
      }
      const pv = this.previewEl;
      if (ui.preview) {
        this.setRect(pv, ui.preview.o, ui.preview.r, ui.preview.c);
        pv.className = 'wall preview show ' + (ui.preview.ok ? 'ok' : 'bad');
      } else pv.className = 'wall preview';
      this.el.classList.toggle('wall-mode', !!ui.wallMode);
    },

    // Nearest wall slot (intersection) to a screen point, for the given orientation.
    slotAt(x, y, o) {
      const rc = this.el.getBoundingClientRect(), G = this.G, n = this.n;
      const px = (x - rc.left) / rc.width * 100, py = (y - rc.top) / rc.height * 100;
      const off = G.s + G.g / 2;
      const clamp = v => Math.max(0, Math.min(n - 2, v));
      return { o, r: clamp(Math.round((py - off) / G.step)), c: clamp(Math.round((px - off) / G.step)) };
    }
  };
  g.Board = Board;
})(typeof window !== 'undefined' ? window : globalThis);
