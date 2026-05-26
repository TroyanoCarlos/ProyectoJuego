import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'menu' }); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor(0x0d1220);

    for (let i = 0; i < 72; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Math.random() < 0.25 ? 2 : 1;
      this.add.circle(x, y, r, 0xffffff, 0.25 + Math.random() * 0.45);
    }

    this.add.rectangle(cx, cy, 620, 370, 0x161d30, 0.96)
      .setStrokeStyle(2, 0x5c79ff, 0.45);

    this.add.text(cx, cy - 126, 'EPN CLICKER', {
      fontSize: '52px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 74, 'Reconstruye la Politecnica edificio por edificio', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#8fa0c8',
    }).setOrigin(0.5);

    const pills = [
      'Clics para monedas',
      'Estudiantes pasivos',
      '10 edificios',
      'Mejoras hasta Nv.10',
      'Eventos academicos',
      'Musica y pausa',
    ];
    const pillW = 260;
    const pillGap = 14;
    const pillX0 = cx - pillW / 2 - pillGap / 2;
    const pillX1 = cx + pillW / 2 + pillGap / 2;
    pills.forEach((p, i) => {
      const px = i % 2 === 0 ? pillX0 : pillX1;
      const py = cy - 28 + Math.floor(i / 2) * 36;
      this.add.rectangle(px, py, pillW, 30, 0x1e2844)
        .setStrokeStyle(1, 0x3a4870, 0.8);
      this.add.text(px, py, p, {
        fontSize: '12px',
        color: '#9eb1ff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    const btn = this.add.rectangle(cx, cy + 124, 230, 54, 0x5c79ff)
      .setStrokeStyle(2, 0xffffff, 0.15)
      .setInteractive({ cursor: 'pointer' });
    const btnTxt = this.add.text(cx, cy + 124, 'JUGAR', {
      fontSize: '22px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x7090ff));
    btn.on('pointerout',  () => btn.setFillStyle(0x5c79ff));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this._startGameMusic();
        const introRequired = localStorage.getItem('epn_intro_required') === '1';
        const showIntro = introRequired || !localStorage.getItem('epn_intro_done');
        this.registry.set('intro-pending', showIntro);
        this.registry.set('tutorial-after-intro', showIntro);
        this.scene.start('game');
        this.scene.launch('ui');
        if (showIntro) {
          localStorage.removeItem('epn_force_intro');
          localStorage.removeItem('epn_tutorial_done');
          this.scene.launch('dialogue');
          this.scene.bringToTop('dialogue');
        }
      });
    });

    this.add.text(width - 10, height - 10, 'v2.0 - Aplicaciones Web EPN', {
      fontSize: '11px',
      color: '#3a4460',
      fontFamily: 'Arial',
    }).setOrigin(1, 1);

    this.cameras.main.fadeIn(400);
  }

  _startGameMusic() {
    const current = this.registry.get('game-music');
    if (current?.isPlaying) return;

    const music = this.sound.add('music-game-bg', {
      loop: true,
      volume: 0.35,
    });
    music.play();
    this.registry.set('game-music', music);
  }
}
