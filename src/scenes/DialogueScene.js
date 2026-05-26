import Phaser from 'phaser';

const TYPE_SPEED = 28;

const SCRIPT = [
  { action: 'enter', side: 'right', key: 'rector-malo', name: 'Rectorcino Sucio' },
  { speaker: 'right', text: 'MUAJAJA! Ser rector ha sido como ser pastelero. Toda la Universidad me la repartí para mí y mis panas.' },
  { speaker: 'right', text: '¡Qué bueno que votaron por mí esos shunshos! MUAJAJA!' },
  { action: 'exitRun', side: 'right', to: 'left' },

  { action: 'enter', side: 'right', key: 'vicerrectora-preocupada', name: 'Vicerrectora.' },
  { speaker: 'right', text: 'No puede ser. La Universidad quedó hecha pedazos. Nos hizo caída y limpia.' },
  { action: 'clearText' },

  { action: 'enter', side: 'left', key: 'rector-normal', name: 'Comedido' },
  { speaker: 'left', text: 'Disculpe señorita, ¿por aquí hay cajero? Es que vi a un señor llevando dinero.' },
  { speaker: 'right', key: 'vicerrectora-preocupada', name: 'Vicerrectora.', text: 'Ya no tenemos ni cajero. Se nos llevó todo ese Rector.' },
  { speaker: 'left', key: 'rector-nervioso', name: 'Comedido', text: '¡Chuta! Ni en fundaciones regalan tanta plata. ¿No habrá un poquito para mí también?' },
  { speaker: 'right', key: 'vicerrectora-seria', name: 'Vicerrectora.', text: '...' },
  { speaker: 'right', key: 'vicerrectora-preocupada', name: 'Vicerrectora.', text: 'No nos queda de otra que cerrar la Politécnica.' },
  { speaker: 'left', key: 'rector-muy-triste', name: 'Comedido', text: '¡No puede ser! Si aquí fueron mis mejores chupizas. Algo se tiene que hacer.' },
  { speaker: 'right', key: 'vicerrectora-preocupada', name: 'Vicerrectora.', text: 'Pues lo único que se me ocurre es que algún comedido nos ayude a reconstruir la Politécnica.' },
  { speaker: 'left', key: 'rector-normal-2', name: 'Comedido', text: 'Entonces yo me postulo para nuevo Rector y levantaremos de nuevo a la EPN.' },
  { speaker: 'right', key: 'vicerrectora-emocionada', name: 'Vicerrectora.', jump: true, text: '¿EN SERIO HARÍA ESO POR NUESTRA UNIVERSIDAD?!! ¡No sabe lo agradecidos que estamos!' },
  { speaker: 'right', key: 'vicerrectora-emocionada', name: 'Vicerrectora.', text: 'Solo queda saber si tiene la capacidad para liderar la Politécnica.' },
  { speaker: 'left', key: 'rector-feliz', name: 'Comedido', text: 'No se preocupe. En la Hemisferios de Quito consigo mi título de administrador en 6 meses.' },
  { speaker: 'right', key: 'vicerrectora-seria', name: 'Vicerrectora.', text: '... ¿Es en serio?' },
];

export default class DialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'dialogue' });
    this._index = -1;
    this._typing = false;
    this._fullText = '';
    this._typedText = '';
    this._typeTimer = null;
    this._characters = {};
    this._activeSpeaker = null;
  }

  create() {
    this.registry.set('ui-blocking', true);
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this._buildOverlay();
    this._buildDialogBox();
    this.input.on('pointerdown', () => this._handleClick());
    this.scale.on('resize', () => this._layout());
    this._nextStep();
  }

  _buildOverlay() {
    const { width, height } = this.scale;
    this._shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.46)
      .setDepth(1);
  }

  _buildDialogBox() {
    const { width, height } = this.scale;
    this._dialogBg = this.add.rectangle(width / 2, height - 110, Math.min(width - 56, 980), 160, 0x07101c, 0.94)
      .setStrokeStyle(3, 0x5c79ff, 0.95)
      .setDepth(20);
    this._nameBg = this.add.rectangle(0, 0, 260, 42, 0x14203a, 0.98)
      .setStrokeStyle(2, 0xf5c518, 0.9)
      .setDepth(21);
    this._nameTxt = this.add.text(0, 0, '', {
      fontSize: '18px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#f5c518',
    }).setOrigin(0.5).setDepth(22);
    this._dialogTxt = this.add.text(0, 0, '', {
      fontSize: '21px',
      fontFamily: 'Arial',
      color: '#ffffff',
      lineSpacing: 8,
      wordWrap: { width: Math.min(width - 120, 880) },
    }).setDepth(22);
    this._hintTxt = this.add.text(0, 0, 'clic para continuar', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#7a8ab0',
    }).setOrigin(1, 1).setDepth(22);
    this._layoutDialog();
  }

  _layout() {
    const { width, height } = this.scale;
    this._shade?.setPosition(width / 2, height / 2).setSize(width, height);
    this._layoutDialog();
    Object.entries(this._characters).forEach(([side, sprite]) => {
      sprite.setPosition(this._targetX(side), this._floorY());
      this._fitCharacter(sprite);
    });
  }

  _layoutDialog() {
    if (!this._dialogBg) return;
    const { width, height } = this.scale;
    const boxW = Math.min(width - 56, 980);
    this._dialogBg.setPosition(width / 2, height - 110).setSize(boxW, 160);
    this._nameBg.setPosition(width / 2 - boxW / 2 + 145, height - 195);
    this._nameTxt.setPosition(this._nameBg.x, this._nameBg.y);
    this._dialogTxt.setPosition(width / 2 - boxW / 2 + 34, height - 158);
    this._dialogTxt.setWordWrapWidth(boxW - 68);
    this._hintTxt.setPosition(width / 2 + boxW / 2 - 24, height - 36);
  }

  _handleClick() {
    if (this._transitioning) return;
    if (this._typing) {
      this._finishTyping();
      return;
    }
    this._nextStep();
  }

  _nextStep() {
    this._index += 1;
    if (this._index >= SCRIPT.length) {
      this._endScene();
      return;
    }

    const step = SCRIPT[this._index];
    if (step.action) {
      this._runAction(step);
      return;
    }

    this._showLine(step);
  }

  _runAction(step) {
    this._hideDialog();
    if (step.action === 'enter') {
      this._enterCharacter(step);
      return;
    }
    if (step.action === 'exitRun') {
      this._exitRun(step);
      return;
    }
    if (step.action === 'clearText') {
      this._setActiveSpeaker(null);
      this.time.delayedCall(260, () => this._nextStep());
    }
  }

  _enterCharacter(step) {
    this._transitioning = true;
    const side = step.side;
    const sprite = this._makeCharacter(step.key, side, step.name);
    sprite.x = side === 'right' ? this.scale.width + 180 : -180;
    sprite.y = this._floorY();
    this._fitCharacter(sprite);
    this._characters[side] = sprite;
    this.tweens.add({
      targets: sprite,
      x: this._targetX(side),
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this._transitioning = false;
        this._nextStep();
      },
    });
  }

  _exitRun(step) {
    const sprite = this._characters[step.side];
    if (!sprite) {
      this._nextStep();
      return;
    }

    this._transitioning = true;
    this.tweens.add({
      targets: sprite,
      x: step.to === 'left' ? -260 : this.scale.width + 260,
      duration: 360,
      ease: 'Quad.easeIn',
      onComplete: () => {
        sprite.destroy();
        delete this._characters[step.side];
        this._transitioning = false;
        this._nextStep();
      },
    });
  }

  _showLine(step) {
    if (step.key) this._swapCharacter(step.speaker, step.key, step.name);
    this._showDialog();
    this._setActiveSpeaker(step.speaker);
    this._nameTxt.setText(step.name ?? this._characters[step.speaker]?._characterName ?? '');
    this._startTyping(step.text);
    if (step.jump) this._jumpCharacter(step.speaker);
  }

  _startTyping(text) {
    this._fullText = text;
    this._typedText = '';
    this._dialogTxt.setText('');
    this._typing = true;
    let i = 0;
    this._typeTimer?.remove(false);
    this._typeTimer = this.time.addEvent({
      delay: TYPE_SPEED,
      loop: true,
      callback: () => {
        i += 1;
        this._typedText = this._fullText.slice(0, i);
        this._dialogTxt.setText(this._typedText);
        if (i >= this._fullText.length) this._finishTyping();
      },
    });
  }

  _finishTyping() {
    this._typing = false;
    this._typeTimer?.remove(false);
    this._typeTimer = null;
    this._dialogTxt.setText(this._fullText);
  }

  _makeCharacter(key, side, name) {
    const sprite = this.add.image(0, 0, key)
      .setOrigin(0.5, 1)
      .setDepth(10);
    sprite._characterKey = key;
    sprite._characterName = name;
    if (side === 'left') sprite.setFlipX(true);
    return sprite;
  }

  _swapCharacter(side, key, name) {
    const old = this._characters[side];
    if (old?._characterKey === key) {
      old._characterName = name ?? old._characterName;
      return;
    }
    const sprite = this._makeCharacter(key, side, name);
    sprite.setPosition(old?.x ?? this._targetX(side), old?.y ?? this._floorY());
    this._fitCharacter(sprite);
    old?.destroy();
    this._characters[side] = sprite;
  }

  _fitCharacter(sprite) {
    const maxH = Math.min(this.scale.height * 0.94, 760);
    const source = sprite.texture.getSourceImage();
    const ratio = maxH / source.height;
    sprite.setDisplaySize(source.width * ratio, maxH);
  }

  _setActiveSpeaker(side) {
    this._activeSpeaker = side;
    Object.entries(this._characters).forEach(([slot, sprite]) => {
      const active = !side || slot === side;
      sprite.setAlpha(active ? 1 : 0.48);
      sprite.setTint(active ? 0xffffff : 0x555566);
      sprite.setDepth(active ? 12 : 9);
    });
  }

  _jumpCharacter(side) {
    const sprite = this._characters[side];
    if (!sprite) return;
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 28,
      duration: 170,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeOut',
    });
  }

  _showDialog() {
    [this._dialogBg, this._nameBg, this._nameTxt, this._dialogTxt, this._hintTxt]
      .forEach(obj => obj?.setVisible(true));
  }

  _hideDialog() {
    [this._dialogBg, this._nameBg, this._nameTxt, this._dialogTxt, this._hintTxt]
      .forEach(obj => obj?.setVisible(false));
  }

  _targetX(side) {
    return side === 'right' ? this.scale.width * 0.74 : this.scale.width * 0.26;
  }

  _floorY() {
    return this.scale.height - 82;
  }

  _endScene() {
    localStorage.setItem('epn_intro_done', '1');
    localStorage.removeItem('epn_intro_required');
    localStorage.removeItem('epn_force_intro');
    this.registry.set('intro-pending', false);
    this.registry.set('ui-blocking', false);
    this.game.events.emit('intro-finished');
    this.scene.stop();
  }
}
