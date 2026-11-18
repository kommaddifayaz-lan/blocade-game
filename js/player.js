(function (g) {
  'use strict';
  class Player {
    constructor(id, name, color, isAI) { this.id = id; this.name = name; this.color = color; this.isAI = !!isAI; }
    static createPair(aiLevel) {
      return [new Player(0, 'Crimson', '#e2504c', false), new Player(1, aiLevel ? 'Computer' : 'Azure', '#3b9ae8', !!aiLevel)];
    }
  }
  g.Player = Player;
})(typeof window !== 'undefined' ? window : globalThis);
