import Phaser from 'phaser';
import GameState          from '../managers/GameState.js';
import SaveSystem         from '../managers/SaveSystem.js';
import AchievementSystem  from '../managers/AchievementSystem.js';
import MissionSystem      from '../managers/MissionSystem.js';
import EventSystem        from '../managers/EventSystem.js';

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
    this.load.image('building-sistemas', new URL('../assets/SistemasEdificio.png', import.meta.url).href);
    this.load.image('building-formacion-basica', new URL('../assets/DepartamentoFormacionBasicaEdificio.png', import.meta.url).href);
    this.load.image('building-administracion', new URL('../assets/AdministracionEdificio.png', import.meta.url).href);
    this.load.image('building-civil', new URL('../assets/CivilEdificio.png', import.meta.url).href);
    this.load.image('building-electrica', new URL('../assets/ElectricaEdificio.png', import.meta.url).href);
    this.load.image('building-electronica', new URL('../assets/ElectricaElectronicaEdificio.png', import.meta.url).href);
    this.load.image('building-mecanica', new URL('../assets/MecanicaEdificio.png', import.meta.url).href);
    this.load.image('building-quimica', new URL('../assets/QuimicaEdificio.png', import.meta.url).href);
    this.load.image('building-cancha', new URL('../assets/CanchaDeportiva.png', import.meta.url).href);
    this.load.image('building-teatro', new URL('../assets/TeatroPolitecnico.png', import.meta.url).href);
    this.load.image('student-1', new URL('../assets/Estudiante1.png', import.meta.url).href);
    this.load.image('student-2', new URL('../assets/Estudiante2.png', import.meta.url).href);
    this.load.image('student-3', new URL('../assets/Estudiante3.png', import.meta.url).href);
    this.load.image('student-4', new URL('../assets/Estudiante4.png', import.meta.url).href);
    this.load.image('student-5', new URL('../assets/Estudiante5.png', import.meta.url).href);
    this.load.image('student-6', new URL('../assets/Estudiante6.png', import.meta.url).href);
    this.load.image('student-7', new URL('../assets/Estudiante7.png', import.meta.url).href);
    this.load.image('student-8', new URL('../assets/Estudiante8.png', import.meta.url).href);
    this.load.image('student-9', new URL('../assets/Estudiante9.png', import.meta.url).href);
    this.load.image('student-10', new URL('../assets/Estudiante10.png', import.meta.url).href);
    this.load.image('student-11', new URL('../assets/Estudiante11.png', import.meta.url).href);
    this.load.image('student-12', new URL('../assets/Estudiante12.png', import.meta.url).href);
    this.load.image('student-13', new URL('../assets/Estudiante13.png', import.meta.url).href);
    this.load.image('student-14', new URL('../assets/Estudiante14.png', import.meta.url).href);
    this.load.image('student-15', new URL('../assets/Estudiante15.png', import.meta.url).href);
    this.load.image('rector-malo', new URL('../assets/RectorMalo.png', import.meta.url).href);
    this.load.image('rector-normal', new URL('../assets/RectorNormal.png', import.meta.url).href);
    this.load.image('rector-normal-2', new URL('../assets/RectorNormal2.png', import.meta.url).href);
    this.load.image('rector-nervioso', new URL('../assets/RectorNervioso.png', import.meta.url).href);
    this.load.image('rector-muy-triste', new URL('../assets/RectorMuyTriste.png', import.meta.url).href);
    this.load.image('rector-feliz', new URL('../assets/RectorFeliz.png', import.meta.url).href);
    this.load.image('vicerrectora-preocupada', new URL('../assets/VicerrectoraPreocupada.png', import.meta.url).href);
    this.load.image('vicerrectora-seria', new URL('../assets/VicerrectoraSeria.png', import.meta.url).href);
    this.load.image('vicerrectora-emocionada', new URL('../assets/VicerrectoraEmocionada.png', import.meta.url).href);
    this.load.audio('music-game-bg', new URL('../audio/musicaFondoJuego.mp3', import.meta.url).href);
  }

  create() {
    // Initialize shared state
    const state = new GameState();
    const save  = new SaveSystem();
    const saved = save.load();
    if (saved) state.loadFrom(saved);

    // Initialize managers
    const achievements = new AchievementSystem(this.game, state);
    const missions     = new MissionSystem(this.game, state);
    const events       = new EventSystem(this.game, state);

    missions.init();

    // Store in registry for cross-scene access
    this.registry.set('state',        state);
    this.registry.set('save',         save);
    this.registry.set('has-save',     !!saved);
    this.registry.set('achievements', achievements);
    this.registry.set('missions',     missions);
    this.registry.set('events',       events);

    this.scene.start('menu');
  }
}
