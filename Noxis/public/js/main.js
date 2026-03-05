import { MenuUI } from './ui/Menu.js';
import { Game } from './core/Game.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    const menu = new MenuUI(game);
    game.attachMenu(menu);
});
