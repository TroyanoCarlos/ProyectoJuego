import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene.js";
import GameScene from "./scenes/GameScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "app",

  width: window.innerWidth,
  height: window.innerHeight,

  backgroundColor: "#121212",

  render: {
    antialias: true,
    pixelArt: false
  },

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  scene: [MenuScene, GameScene]
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});