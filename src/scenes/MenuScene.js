import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'menu' }); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor(0x0d1220);

    // Background stars
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Math.random() < 0.3 ? 2 : 1;
      this.add.circle(x, y, r, 0xffffff, 0.4 + Math.random() * 0.4);
    }

    // Card
    this.add.rectangle(cx, cy, 520, 320, 0x161d30, 0.95)
      .setStrokeStyle(2, 0x5c79ff, 0.4);

    // Title
    this.add.text(cx, cy - 100, 'EPN CLICKER', {
      fontSize: '52px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 48, 'Construye tu campus universitario', {
      fontSize: '16px', fontFamily: 'Arial', color: '#7a8ab0',
    }).setOrigin(0.5);

    // Feature pills — 2 columnas centradas dentro del recuadro (520px ancho)
    const pills = ['💰 Genera monedas', '🧠 Quizzes académicos', '🏛️ 4 Facultades', '📋 Misiones'];
    const pillW = 218;
    const pillGap = 12;
    const pillX0 = cx - pillW / 2 - pillGap / 2;  // centro columna izquierda
    const pillX1 = cx + pillW / 2 + pillGap / 2;  // centro columna derecha
    pills.forEach((p, i) => {
      const px = i % 2 === 0 ? pillX0 : pillX1;
      const py = cy + (i < 2 ? -4 : 30);
      this.add.rectangle(px, py, pillW, 28, 0x1e2844).setStrokeStyle(1, 0x3a4870, 0.8);
      this.add.text(px, py, p, { fontSize: '12px', color: '#9eb1ff', fontFamily: 'Arial' }).setOrigin(0.5);
    });

    // Play button
    const btn = this.add.rectangle(cx, cy + 90, 220, 52, 0x5c79ff)
      .setStrokeStyle(2, 0xffffff, 0.15)
      .setInteractive({ cursor: 'pointer' });
    const btnTxt = this.add.text(cx, cy + 90, '▶  JUGAR', {
      fontSize: '22px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x7090ff));
    btn.on('pointerout',  () => btn.setFillStyle(0x5c79ff));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('game');
        this.scene.launch('ui');
      });
    });

    // Version
    this.add.text(width - 10, height - 10, 'v2.0 — Aplicaciones Web EPN', {
      fontSize: '11px', color: '#3a4460', fontFamily: 'Arial',
    }).setOrigin(1, 1);

    this.cameras.main.fadeIn(400);
  }
}
