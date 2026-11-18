(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    UI.init(game);
    game.start(UI.readSettings());
    window.blocade = { game, Rules, Movement, Wall, AI }; // handy for console experiments
  });
})();
