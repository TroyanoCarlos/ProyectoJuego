import Phaser from 'phaser';
import GameState          from '../systems/GameState.js';
import SaveSystem         from '../systems/SaveSystem.js';
import AchievementSystem  from '../systems/AchievementSystem.js';
import MissionSystem      from '../systems/MissionSystem.js';
import EventSystem        from '../systems/EventSystem.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'boot' }); }

  preload() {
    // Loading bar
    const { width, height } = this.scale;
    const barW = 320;
    const barH = 16;
    const barX = width / 2 - barW / 2;
    const barY = height / 2 + 20;

    this.add.rectangle(width / 2, height / 2 - 30, 260, 50, 0x1a2540)
      .setStrokeStyle(2, 0x5c79ff, 0.6);
    this.add.text(width / 2, height / 2 - 30, 'EPN CLICKER', {
      fontSize: '24px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    const bg  = this.add.rectangle(width / 2, barY + barH / 2, barW, barH, 0x1e2844);
    const bar = this.add.rectangle(barX, barY + barH / 2, 0, barH - 4, 0x5c79ff).setOrigin(0, 0.5);
    const pct = this.add.text(width / 2, barY + barH + 14, '0%', {
      fontSize: '13px', color: '#7a8ab0', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.load.on('progress', v => {
      bar.width = barW * v;
      pct.setText(`${Math.round(v * 100)}%`);
    });

    // Assets
    this.load.image('campus',   new URL('../assets/MapaCampus.png',     import.meta.url).href);
    this.load.image('building', new URL('../assets/SistemasEdificio.png', import.meta.url).href);
  }

  create() {
    // Initialize shared state
    const state = new GameState();
    const save  = new SaveSystem();
    const saved = save.load();
    if (saved) state.loadFrom(saved);

    // Initialize systems
    const achievements = new AchievementSystem(this.game, state);
    const missions     = new MissionSystem(this.game, state);
    const events       = new EventSystem(this.game, state);

    missions.init();

    // Store in registry for cross-scene access
    this.registry.set('state',        state);
    this.registry.set('save',         save);
    this.registry.set('achievements', achievements);
    this.registry.set('missions',     missions);
    this.registry.set('events',       events);

    this.scene.start('menu');
  }
}
