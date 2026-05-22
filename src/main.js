import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene   from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width:  window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0d1220',
  render: { antialias: true, pixelArt: false },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
