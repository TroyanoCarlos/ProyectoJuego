import Phaser from 'phaser';
import { BUILDING_TYPES } from '../data/BuildingTypes.js';
import { DROP_SPOTS }     from '../data/DropSpots.js';
import { QUIZ_DATA }      from '../data/QuizData.js';
import { fmtNumber }      from '../utils/Format.js';
import {
  MAX_BUILDING_LEVEL,
  MAX_STUDENTS_PER_BUILDING,
  passiveCoinsPerStudent,
  studentCost,
  upgradeCost,
} from '../data/Economy.js';
import { maybeShowCampusRebuiltPopup, showTutorial } from '../ui/TutorialUI.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ui' });
    this._sidebarOpen   = false;
    this._missionsOpen  = false;
    this._sidebarW      = 300;
    this._dragging      = null;   // typeId being dragged
    this._ghost         = null;   // drag ghost image
    this._selectedSpot  = null;
    this._quizOpen      = false;
    this._toastQueue    = [];
    this._toastBusy     = false;
    this._statusTimer   = null;
    this._paletteScroll = 0;
    this._gamePaused    = false;
  }

  create() {
    this._state    = this.registry.get('state');
    this._missions = this.registry.get('missions');
    this._events   = this.registry.get('events');

    this._buildHUD();
    this._buildSidebar();
    this._buildMissionsPanel();
    this._bindEvents();
    this._setupDrag();

    this._scheduleTutorial();

    this.cameras.main.fadeIn(400);
  }

  // ────────────────────────────── HUD ──────────────────────────────

  _buildHUD() {
    const W = this.scale.width;

    this._hudBg     = this.add.rectangle(W / 2, 45, W, 90, 0x0d1220, 0.97);
    this._hudLine   = this.add.rectangle(W / 2, 89, W, 2, 0x5c79ff, 0.2);

    this._coinsTxt  = this.add.text(28, 14, '🪙 0', {
      fontSize: '30px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#f5c518',
    });
    this._infoTxt   = this.add.text(28, 52, 'Total: 0  |  Prod: 0/s  |  Campus Nv.1', {
      fontSize: '12px', color: '#4a5a7a', fontFamily: 'Arial',
    });

    this._statusTxt = this.add.text(W / 2, 45, 'Abre la paleta y arrastra un edificio al campus.', {
      fontSize: '14px', color: '#c8d0ff', fontFamily: 'Arial', align: 'center',
    }).setOrigin(0.5);

    // Save button
    const saveBtn = this.add.rectangle(W - 68, 35, 106, 32, 0x1e2844)
      .setStrokeStyle(1, 0x5c79ff, 0.6).setInteractive({ cursor: 'pointer' });
    this.add.text(W - 68, 35, '💾 Guardar', {
      fontSize: '13px', color: '#9eb1ff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.game.events.emit('ui:save'));
    saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x2a3860));
    saveBtn.on('pointerout',  () => saveBtn.setFillStyle(0x1e2844));
    saveBtn.on('pointerdown', () => this.game.events.emit('ui:save'));

    this._pauseBtn = this.add.rectangle(W - 190, 35, 116, 32, 0x1e2844)
      .setStrokeStyle(1, 0x5c79ff, 0.6).setInteractive({ cursor: 'pointer' });
    this._pauseBtnTxt = this.add.text(W - 190, 35, 'Pausar', {
      fontSize: '13px', color: '#9eb1ff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    this._pauseBtn.on('pointerover', () => this._pauseBtn.setFillStyle(0x2a3860));
    this._pauseBtn.on('pointerout',  () => this._pauseBtn.setFillStyle(0x1e2844));
    this._pauseBtn.on('pointerdown', () => this._togglePause());
    this._pauseBtnTxt.on('pointerdown', () => this._togglePause());
    this._pauseBtn.setDepth(104);
    this._pauseBtnTxt.setDepth(105);

    // Reset button (small, corner)
    const resetBtn = this.add.text(W - 8, 78, '↺', {
      fontSize: '14px', color: '#2a3450', fontFamily: 'Arial',
    }).setOrigin(1, 1).setInteractive({ cursor: 'pointer' });
    resetBtn.on('pointerover', () => resetBtn.setColor('#ff6655'));
    resetBtn.on('pointerout',  () => resetBtn.setColor('#2a3450'));
    resetBtn.on('pointerdown', () => this._confirmReset());
  }

  _updateHUD() {
    const s = this._state;
    this._coinsTxt.setText(`🪙 ${fmtNumber(s.coins)}`);
    this._infoTxt.setText(
      `Total: ${fmtNumber(s.totalCoinsEarned)}  |  Prod: ${s.totalProduction.toFixed(1)}/s  |  Campus Nv.${s.campusLevel}`
    );
    this._updateUpgradePanel();
    this._updateBuildingCards();
    this._updateMissionsPanel();
  }

  _setStatus(msg, duration = 0) {
    this._statusTxt.setText(msg);
    if (this._statusTimer) { this._statusTimer.remove(false); this._statusTimer = null; }
    if (duration > 0) {
      this._statusTimer = this.time.delayedCall(duration, () => this._statusTxt.setText(''));
    }
  }

  // ────────────────────────────── SIDEBAR ──────────────────────────────

  _buildSidebar() {
    const SW = this._sidebarW;
    this._sidebar = this.add.container(this._sidebarOpen ? 0 : -SW, 0);

    const bg  = this.add.rectangle(SW / 2, 460, SW, 880, 0x0d1220, 0.97).setStrokeStyle(1, 0x5c79ff, 0.15);
    const tab = this.add.rectangle(SW + 18, 460, 36, 100, 0x5c79ff, 0.95)
      .setStrokeStyle(1, 0xffffff, 0.1).setInteractive({ cursor: 'pointer' });
    this._tabTxt = this.add.text(SW + 18, 460, '>', {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    const title = this.add.text(SW / 2, 108, 'CAMPUS EPN', {
      fontSize: '19px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const sub = this.add.text(SW / 2, 132, 'Arrastra una facultad al campus', {
      fontSize: '11px', color: '#4a5a7a', fontFamily: 'Arial',
    }).setOrigin(0.5);
    const div = this.add.rectangle(SW / 2, 150, 260, 1, 0x5c79ff, 0.2);

    this._sidebar.add([bg, tab, this._tabTxt, title, sub, div]);

    tab.on('pointerdown', () => this._toggleSidebar());
    this._tabTxt.on('pointerdown', () => this._toggleSidebar());

    // Building cards
    this._cards = {};
    const upgradeLayout = this._upgradePanelLayout();
    this._paletteTop = 154;
    this._paletteBottom = Math.max(this._paletteTop + 220, upgradeLayout.top - 16);
    this._paletteContainer = this.add.container(0, 0);
    const paletteMask = this.make.graphics({ x: 0, y: 0, add: false });
    paletteMask.fillStyle(0xffffff);
    paletteMask.fillRect(0, this._paletteTop, SW, this._paletteBottom - this._paletteTop);
    this._paletteContainer.setMask(paletteMask.createGeometryMask());
    this._sidebar.add(this._paletteContainer);

    BUILDING_TYPES.forEach((type, i) => this._buildCard(type, i));
    this._bindPaletteScroll();

    // Upgrade panel
    this._buildUpgradePanel();

    this.registry.set('ui-blocking', false);
  }

  _buildCard(type, index) {
    const SW  = this._sidebarW;
    const cy  = 190 + index * 88;
    const affordable = this._state.coins >= type.placeCost;
    const built = this._isBuildingTypeBuilt(type.id);
    const nextInOrder = this._isNextBuildingType(type.id);
    const enabled = affordable && !built && nextInOrder;

    const card = this.add.rectangle(SW / 2, cy, 268, 78, 0x111826)
      .setStrokeStyle(2, type.color, enabled ? 0.5 : 0.12);

    const nameTxt = this.add.text(14, cy - 28, type.name, {
      fontSize: '12px', color: enabled ? '#ffffff' : '#3a4460',
      fontFamily: 'Arial', fontStyle: 'bold', wordWrap: { width: 168 },
    }).setOrigin(0, 0.5);

    const descTxt = this.add.text(14, cy - 2, type.description, {
      fontSize: '11px', color: enabled ? '#7a8ab0' : '#2a3040', fontFamily: 'Arial',
    }).setOrigin(0, 0.5);

    const costColor = built ? '#4a5a7a' : type.placeCost === 0 ? '#55dd77' : affordable ? '#f5c518' : '#cc4444';
    const costLabel = type.placeCost === 0 ? '✓ Gratis' : `Costo: ${fmtNumber(type.placeCost)} 🪙`;
    const costTxt = this.add.text(14, cy + 22, costLabel, {
      fontSize: '12px', color: costColor, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    if (built) costTxt.setText('Construido');

    // Drag handle image (right side of card)
    const img = this.add.image(SW - 44, cy, type.texture)
      .setDisplaySize(64, 64).setTint(type.tint)
      .setAlpha(enabled ? 1 : 0.25)
      .setInteractive({ cursor: enabled ? 'grab' : 'not-allowed' });

    img._typeId = type.id;
    img._homeX  = SW - 44;
    img._homeY  = cy;

    // Drag via pointerdown on img
    img.on('pointerdown', (ptr) => {
      if (this._isBuildingTypeBuilt(type.id)) {
        this._setStatus(`${type.name} ya fue construido.`, 3000);
        return;
      }
      if (!this._isNextBuildingType(type.id)) {
        const next = this._nextBuildingType();
        this._setStatus(`Primero construye ${next?.name ?? 'el edificio anterior'}.`, 3000);
        return;
      }
      if (this._state.coins < type.placeCost) {
        this._setStatus(`Necesitas ${fmtNumber(type.placeCost)} 🪙 para construir ${type.name}.`, 3000);
        return;
      }
      this._startDrag(type.id, ptr);
    });

    this._paletteContainer.add([card, nameTxt, descTxt, costTxt, img]);
    this._cards[type.id] = { card, nameTxt, descTxt, costTxt, img };
  }

  _togglePause() {
    this._gamePaused = !this._gamePaused;
    const music = this.registry.get('game-music');

    if (this._gamePaused) {
      this.scene.pause('game');
      music?.pause();
      this._showPauseOverlay();
      this._pauseBtnTxt.setText('Reanudar').setColor('#ffffff');
      this._setStatus('Juego pausado.', 0);
      return;
    }

    this.scene.resume('game');
    music?.resume();
    this._hidePauseOverlay();
    this._pauseBtnTxt.setText('Pausar').setColor('#9eb1ff');
    this._setStatus('Juego reanudado.', 2500);
  }

  _showPauseOverlay() {
    if (this._pauseOverlay?.length) return;
    const { width: W, height: H } = this.scale;
    const cx = W / 2;
    const cy = H / 2;
    this._pauseOverlay = [
      this.add.rectangle(cx, cy, W, H, 0x000000, 0.58)
        .setDepth(100)
        .setInteractive(),
      this.add.text(cx, cy - 24, 'Ⅱ', {
        fontSize: '96px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
      }).setOrigin(0.5).setDepth(101),
      this.add.text(cx, cy + 58, 'PAUSA', {
        fontSize: '24px',
        fontFamily: 'Orbitron, Arial',
        fontStyle: 'bold',
        color: '#f5c518',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(101),
    ];
    this.children.bringToTop(this._pauseBtn);
    this.children.bringToTop(this._pauseBtnTxt);
  }

  _hidePauseOverlay() {
    this._pauseOverlay?.forEach(obj => {
      if (obj?.active) obj.destroy();
    });
    this._pauseOverlay = null;
  }

  _bindPaletteScroll() {
    this.input.on('wheel', (ptr, objs, dx, dy) => {
      const paletteTop = this._paletteTop ?? 154;
      const paletteBottom = this._paletteBottom ?? 614;
      if (!this._sidebarOpen || ptr.x > this._sidebarW || ptr.y < paletteTop || ptr.y > paletteBottom) return;
      const contentBottom = 190 + (BUILDING_TYPES.length - 1) * 88 + 39;
      const maxScroll = Math.max(0, contentBottom - paletteBottom);
      this._paletteScroll = Phaser.Math.Clamp(this._paletteScroll + dy * 0.5, 0, maxScroll);
      this._paletteContainer.y = -this._paletteScroll;
    });
  }

  _updateBuildingCards() {
    if (!this._cards) return;
    BUILDING_TYPES.forEach(type => {
      const c = this._cards[type.id];
      if (!c) return;
      const affordable = this._state.coins >= type.placeCost;
      const built = this._isBuildingTypeBuilt(type.id);
      const nextInOrder = this._isNextBuildingType(type.id);
      const enabled = affordable && !built && nextInOrder;
      if (built) c.costTxt.setText('Construido');
      c.costTxt.setColor(built ? '#4a5a7a' : type.placeCost === 0 ? '#55dd77' : affordable ? '#f5c518' : '#cc4444');
      c.nameTxt.setColor(enabled ? '#ffffff' : '#3a4460');
      c.descTxt.setColor(enabled ? '#7a8ab0' : '#2a3040');
      c.img.setAlpha(enabled ? 1 : 0.25);
      c.img.input.cursor = enabled ? 'grab' : 'not-allowed';
      c.card.setStrokeStyle(2, type.color, enabled ? 0.5 : 0.12);
    });
  }

  _isBuildingTypeBuilt(typeId) {
    return Object.values(this._state.placedBuildings).some(b => b.typeId === typeId);
  }

  _nextBuildingType() {
    return BUILDING_TYPES.find(type => !this._isBuildingTypeBuilt(type.id));
  }

  _isNextBuildingType(typeId) {
    const next = this._nextBuildingType();
    return !next || next.id === typeId;
  }

  _buildUpgradePanel() {
    const SW = this._sidebarW;
    const { cy } = this._upgradePanelLayout();

    const panelBg = this.add.rectangle(SW / 2, cy + 48, SW - 8, 250, 0x0d1220, 1)
      .setStrokeStyle(1, 0x5c79ff, 0.12);
    const div = this.add.rectangle(SW / 2, cy - 38, 260, 1, 0x5c79ff, 0.2);
    const title = this.add.text(SW / 2, cy - 20, 'MEJORAR EDIFICIO', {
      fontSize: '12px', fontFamily: 'Orbitron, Arial', color: '#4a5a7a', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._upgInfoTxt = this.add.text(SW / 2, cy + 18, 'Haz clic en\nun edificio del campus', {
      fontSize: '13px', color: '#3a4460', fontFamily: 'Arial', align: 'center',
    }).setOrigin(0.5);

    this._upgCostTxt = this.add.text(SW / 2, cy + 55, '', {
      fontSize: '13px', color: '#f5c518', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._upgBtn = this.add.rectangle(SW / 2, cy + 86, 220, 40, 0x1a2540)
      .setStrokeStyle(2, 0x5c79ff, 0.4).setInteractive({ cursor: 'pointer' });
    this._upgBtnTxt = this.add.text(SW / 2, cy + 86, 'Selecciona un edificio', {
      fontSize: '14px', color: '#3a4460', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    this._studentCostTxt = this.add.text(SW / 2, cy + 124, '', {
      fontSize: '12px', color: '#7a8ab0', fontFamily: 'Arial', fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this._studentBtn = this.add.rectangle(SW / 2, cy + 156, 220, 36, 0x1a2540)
      .setStrokeStyle(2, 0x55dd77, 0.35).setInteractive({ cursor: 'pointer' });
    this._studentBtnTxt = this.add.text(SW / 2, cy + 156, 'Admitir estudiante', {
      fontSize: '13px', color: '#3a4460', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    this._sidebar.add([
      panelBg, div, title, this._upgInfoTxt, this._upgCostTxt, this._upgBtn, this._upgBtnTxt,
      this._studentCostTxt, this._studentBtn, this._studentBtnTxt,
    ]);

    this._upgBtn.on('pointerover', () => { if (this._selectedSpot !== null) this._upgBtn.setFillStyle(0x2a3860); });
    this._upgBtn.on('pointerout',  () => this._upgBtn.setFillStyle(0x1a2540));
    this._upgBtn.on('pointerdown', () => {
      if (this._selectedSpot !== null) this.game.events.emit('ui:upgrade', { spotId: this._selectedSpot });
    });
    this._upgBtnTxt.on('pointerdown', () => {
      if (this._selectedSpot !== null) this.game.events.emit('ui:upgrade', { spotId: this._selectedSpot });
    });
    this._studentBtn.on('pointerover', () => { if (this._selectedSpot !== null) this._studentBtn.setFillStyle(0x20304a); });
    this._studentBtn.on('pointerout',  () => this._studentBtn.setFillStyle(0x1a2540));
    this._studentBtn.on('pointerdown', () => {
      if (this._selectedSpot !== null) this.game.events.emit('ui:admit-student', { spotId: this._selectedSpot });
    });
    this._studentBtnTxt.on('pointerdown', () => {
      if (this._selectedSpot !== null) this.game.events.emit('ui:admit-student', { spotId: this._selectedSpot });
    });
  }

  _upgradePanelLayout() {
    const panelBottom = Math.min(this.scale.height - 22, 858);
    const cy = panelBottom - 174;
    return {
      cy,
      top: cy - 77,
      bottom: cy + 173,
    };
  }

  _updateUpgradePanel() {
    if (!this._upgInfoTxt) return;
    if (this._selectedSpot === null) {
      this._upgInfoTxt.setText('Haz clic en\nun edificio del campus').setColor('#3a4460');
      this._upgCostTxt.setText('');
      this._upgBtnTxt.setText('Selecciona un edificio').setColor('#3a4460');
      this._studentCostTxt?.setText('');
      this._studentBtnTxt?.setText('Admitir estudiante').setColor('#3a4460');
      return;
    }

    const bData = this._state.placedBuildings[this._selectedSpot];
    if (!bData) return;
    const type = BUILDING_TYPES.find(t => t.id === bData.typeId);
    const students = bData.students ?? 0;
    const perStudent = passiveCoinsPerStudent(bData);
    const passivePerTick = students * perStudent;
    const passivePerSec = passivePerTick / (bData.productionInterval / 1000);
    const nextStudentCost = studentCost(type, bData);
    const maxStudents = students >= MAX_STUDENTS_PER_BUILDING;
    const canStudent = !maxStudents && this._state.coins >= nextStudentCost;

    this._upgInfoTxt.setText(
      `${type.name}\nNv.${bData.level} | Clic +${fmtNumber(bData.coinsPerTick)} | Est. ${students}\nPasivo ${passivePerSec.toFixed(1)}/s`
    ).setColor('#c8d0ff');
    this._studentCostTxt.setText(maxStudents
      ? `Maximo de estudiantes: ${MAX_STUDENTS_PER_BUILDING}`
      : `Admitir: ${fmtNumber(nextStudentCost)} monedas | +${fmtNumber(perStudent)} por ciclo`
    ).setColor(maxStudents ? '#55dd77' : canStudent ? '#55dd77' : '#cc4444');
    this._studentBtnTxt.setText(maxStudents ? 'Maximo alcanzado' : 'Admitir estudiante').setColor(canStudent ? '#ffffff' : '#3a4460');

    if (bData.level >= MAX_BUILDING_LEVEL) {
      this._upgCostTxt.setText('Nivel maximo alcanzado').setColor('#55dd77');
      this._upgBtnTxt.setText('Nivel maximo').setColor('#3a4460');
      return;
    }

    const cost = upgradeCost(type, bData);
    const can  = this._state.coins >= cost;
    this._upgCostTxt.setText(`Costo mejora: ${fmtNumber(cost)} monedas`).setColor(can ? '#f5c518' : '#cc4444');
    this._upgBtnTxt.setText(`Mejorar -> Nv.${bData.level + 1}`).setColor(can ? '#ffffff' : '#3a4460');
  }

  _toggleSidebar() {
    this._sidebarOpen = !this._sidebarOpen;
    this._tabTxt.setText(this._sidebarOpen ? '<' : '>');
    this.tweens.add({
      targets: this._sidebar, x: this._sidebarOpen ? 0 : -this._sidebarW,
      duration: 260, ease: 'Sine.easeOut',
    });
    this.registry.set('ui-blocking', this._sidebarOpen);
  }

  // ────────────────────────────── DRAG ──────────────────────────────

  _setupDrag() {
    this.input.on('pointermove', ptr => {
      if (!this._dragging || !this._ghost) return;
      this._ghost.setPosition(ptr.x, ptr.y);
      const gameScene = this.scene.get('game');
      const wp = gameScene.getWorldPoint(ptr.x, ptr.y);
      this.game.events.emit('ui:drag-over', { worldX: wp.x, worldY: wp.y, typeId: this._dragging });
    });

    this.input.on('pointerup', ptr => {
      if (!this._dragging) return;
      const gameScene = this.scene.get('game');
      const wp = gameScene.getWorldPoint(ptr.x, ptr.y);
      this.game.events.emit('ui:drop-building', { worldX: wp.x, worldY: wp.y, typeId: this._dragging });
      this.game.events.emit('ui:clear-highlights');
      this._ghost?.destroy();
      this._ghost   = null;
      this._dragging = null;
      this.registry.set('ui-dragging', false);
    });
  }

  _startDrag(typeId, ptr) {
    const type    = BUILDING_TYPES.find(t => t.id === typeId);
    this._dragging = typeId;
    this.registry.set('ui-dragging', true);

    this._ghost = this.add.image(ptr.x, ptr.y, type.texture)
      .setDisplaySize(80, 80).setTint(type.tint).setAlpha(0.7).setDepth(100);
  }

  // ────────────────────────────── MISSIONS PANEL ──────────────────────────────

  _buildMissionsPanel() {
    const W  = this.scale.width;
    const PW = 270;
    this._missionPanelW = PW;
    this._missionsContainer = this.add.container(W + PW, 0);

    const bg  = this.add.rectangle(PW / 2, 360, PW, 500, 0x0d1220, 0.97).setStrokeStyle(1, 0x5c79ff, 0.15);
    const hdr = this.add.rectangle(PW / 2, 118, PW, 50, 0x5c79ff, 0.1);
    const ttl = this.add.text(PW / 2, 118, '📋  MISIONES', {
      fontSize: '14px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#9eb1ff',
    }).setOrigin(0.5);

    this._missionsContainer.add([bg, hdr, ttl]);

    this._missionCards = [];
    for (let i = 0; i < 3; i++) {
      const cy = 182 + i * 115;
      const mc = {
        bg:     this.add.rectangle(PW / 2, cy, PW - 20, 100, 0x111826).setStrokeStyle(1, 0x2a3450, 0.6),
        icon:   this.add.text(16, cy - 34, '', { fontSize: '20px' }),
        title:  this.add.text(44, cy - 36, '', { fontSize: '12px', color: '#c8d0ff', fontFamily: 'Arial', fontStyle: 'bold', wordWrap: { width: PW - 70 } }).setOrigin(0, 0),
        prog:   this.add.text(44, cy - 8,  '', { fontSize: '11px', color: '#4a5a7a', fontFamily: 'Arial' }).setOrigin(0, 0),
        barBg:  this.add.rectangle(PW / 2, cy + 22, PW - 40, 8, 0x1e2844),
        bar:    this.add.rectangle(10, cy + 22, 0, 6, 0x5c79ff).setOrigin(0, 0.5),
        reward: this.add.text(PW - 14, cy + 22, '', { fontSize: '11px', color: '#f5c518', fontFamily: 'Arial', fontStyle: 'bold' }).setOrigin(1, 0.5),
      };
      this._missionsContainer.add(Object.values(mc));
      this._missionCards.push(mc);
    }

    // Toggle button
    const W2 = this.scale.width;
    this._missionTabBtn = this.add.rectangle(W2 - 20, 200, 40, 80, 0x5c79ff, 0.9)
      .setStrokeStyle(1, 0xffffff, 0.1).setInteractive({ cursor: 'pointer' });
    this.add.text(W2 - 20, 200, '📋', { fontSize: '18px' }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this._toggleMissions());
    this._missionTabBtn.on('pointerdown', () => this._toggleMissions());

    this._updateMissionsPanel();
  }

  _updateMissionsPanel() {
    if (!this._missionCards) return;
    const PW     = this._missionPanelW;
    const barMax = PW - 40;
    const active = this._missions.getActive();

    this._missionCards.forEach((mc, i) => {
      const m = active[i];
      if (!m) {
        mc.icon.setText(''); mc.title.setText('Sin misiones'); mc.prog.setText('');
        mc.bar.width = 0; mc.reward.setText('');
        return;
      }
      const cur = this._missions.getProgress(m);
      const pct = cur / m.target;
      mc.icon.setText(m.icon);
      mc.title.setText(m.text);
      mc.prog.setText(`${fmtNumber(cur)} / ${fmtNumber(m.target)}`);
      mc.bar.width = barMax * pct;
      mc.bar.setFillStyle(pct >= 1 ? 0x55dd77 : 0x5c79ff);
      mc.reward.setText(`+${fmtNumber(m.reward)} 🪙`);
    });
  }

  _toggleMissions() {
    const W  = this.scale.width;
    const PW = this._missionPanelW;
    this._missionsOpen = !this._missionsOpen;
    this.tweens.add({
      targets: this._missionsContainer,
      x: this._missionsOpen ? W - PW : W + PW,
      duration: 260, ease: 'Sine.easeOut',
    });
  }

  // ────────────────────────────── QUIZ MODAL ──────────────────────────────

  _showQuiz({ facultyId, question }) {
    if (this._quizOpen) return;
    this._quizOpen = true;
    const { width: W, height: H } = this.scale;
    const data = QUIZ_DATA[facultyId] ?? QUIZ_DATA.sistemas;
    const placed = Object.values(this._state.placedBuildings).find(b => b.typeId === facultyId);
    const bonus  = placed ? 50 * placed.level : 50;
    const objs   = [];
    const cx = W / 2, cy = H / 2;

    const add = o => { objs.push(o); return o; };

    add(this.add.rectangle(cx, cy, W, H, 0x000000, 0.65).setDepth(80));
    add(this.add.rectangle(cx, cy, 540, 410, 0x0d1220).setStrokeStyle(3, data.color, 0.9).setDepth(81));
    add(this.add.rectangle(cx, cy - 180, 540, 50, data.color, 0.2).setDepth(82));
    add(this.add.text(cx - 240, cy - 193, `${data.icon}  ${data.eventName}`, {
      fontSize: '15px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ffffff',
    }).setDepth(83));
    add(this.add.text(cx + 170, cy - 193, `+${bonus} 🪙`, {
      fontSize: '14px', color: '#f5c518', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(83));

    // Timer bar
    const timerBg  = add(this.add.rectangle(cx, cy - 152, 500, 8, 0x1e2844).setDepth(82));
    const timerBar = add(this.add.rectangle(cx - 250, cy - 152, 500, 6, data.color).setOrigin(0, 0.5).setDepth(83));
    const ttween   = this.tweens.add({ targets: timerBar, width: 0, duration: 20000, ease: 'Linear' });

    add(this.add.text(cx, cy - 120, question.q, {
      fontSize: '15px', color: '#e0e8ff', fontFamily: 'Arial', align: 'center',
      wordWrap: { width: 490 }, lineSpacing: 5,
    }).setOrigin(0.5).setDepth(82));

    const optPos = [{x:cx-128,y:cy+10},{x:cx+128,y:cy+10},{x:cx-128,y:cy+80},{x:cx+128,y:cy+80}];
    const letters = ['A','B','C','D'];
    let answered = false;

    const close = () => { objs.forEach(o => { if (o?.active) o.destroy(); }); this._quizOpen = false; };

    const autoClose = this.time.delayedCall(20000, () => {
      if (!answered) { answered = true; showResult(false, 0, close); }
    });

    optPos.forEach((pos, i) => {
      const isCorrect = i === question.correct;
      const btn = add(this.add.rectangle(pos.x, pos.y, 238, 54, 0x111826)
        .setStrokeStyle(2, 0x3a4870, 0.8).setInteractive({ cursor: 'pointer' }).setDepth(82));
      const txt = add(this.add.text(pos.x - 100, pos.y, `${letters[i]})  ${question.opts[i]}`, {
        fontSize: '13px', color: '#c8d0ff', fontFamily: 'Arial', wordWrap: { width: 210 },
      }).setOrigin(0, 0.5).setDepth(83));

      btn.on('pointerover', () => { if (!answered) btn.setFillStyle(0x1e2c50); });
      btn.on('pointerout',  () => { if (!answered) btn.setFillStyle(0x111826); });
      btn.on('pointerdown', () => {
        if (answered) return;
        answered = true;
        autoClose.remove(false);
        ttween.stop();
        if (isCorrect) {
          btn.setFillStyle(0x1a4020).setStrokeStyle(2, 0x55dd77, 1);
          txt.setColor('#88ff99');
        } else {
          btn.setFillStyle(0x401a1a).setStrokeStyle(2, 0xff5555, 1);
          txt.setColor('#ff8888');
        }
        this._events.resolveQuiz(isCorrect, facultyId);
        showResult(isCorrect, isCorrect ? bonus : Math.max(5, Math.floor(bonus * 0.1)), close);
      });
    });

    const showResult = (ok, coins, onDone) => {
      const rBg = add(this.add.rectangle(cx, cy + 158, 540, 52, ok ? 0x1a4020 : 0x401a1a)
        .setStrokeStyle(2, ok ? 0x55dd77 : 0xff5555, 0.9).setDepth(84));
      const msg = ok ? `¡Correcto! +${coins} 🪙` : coins > 0 ? `Incorrecto. +${coins} 🪙 consolación` : 'Tiempo agotado.';
      add(this.add.text(cx, cy + 158, msg, {
        fontSize: '15px', color: ok ? '#88ff99' : '#ff8888', fontFamily: 'Arial', fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5).setDepth(85));
      this.time.delayedCall(2200, onDone);
      this._events.closeQuiz();
    };
  }

  // ────────────────────────────── TOAST ──────────────────────────────

  _queueToast(data) {
    this._toastQueue.push(data);
    if (!this._toastBusy) this._showNextToast();
  }

  _showNextToast() {
    if (this._toastQueue.length === 0) { this._toastBusy = false; return; }
    this._toastBusy = true;
    const d = this._toastQueue.shift();
    const W = this.scale.width;
    const startX = W + 200, endX = W - 210, y = d.y ?? 130;

    const bg = this.add.rectangle(startX, y, 360, 70, d.bg ?? 0x1a2540)
      .setStrokeStyle(2, d.border ?? 0xf5c518, 0.9).setDepth(70);
    const t1 = this.add.text(startX - 150, y - 13, d.title, {
      fontSize: '15px', color: d.titleColor ?? '#f5c518', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(71);
    const t2 = this.add.text(startX - 150, y + 9, d.body, {
      fontSize: '12px', color: d.bodyColor ?? '#c8d0ff', fontFamily: 'Arial',
    }).setDepth(71);

    const shift = startX - endX;
    this.tweens.add({
      targets: [bg, t1, t2], x: `-=${shift}`, duration: 380, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2600, () => {
          this.tweens.add({
            targets: [bg, t1, t2], x: `+=${shift}`, alpha: 0, duration: 320,
            onComplete: () => { [bg, t1, t2].forEach(o => o.destroy()); this._showNextToast(); },
          });
        });
      },
    });
  }

  // ────────────────────────────── OFFLINE POPUP ──────────────────────────────

  _showOfflinePopup({ amount, seconds }) {
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;
    const mins = Math.floor(seconds / 60);
    const timeStr = mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins % 60}m`;
    const objs = [];
    const add = o => { objs.push(o); return o; };

    add(this.add.rectangle(cx, cy, W, H, 0x000000, 0.6).setDepth(60));
    add(this.add.rectangle(cx, cy, 400, 220, 0x0d1220).setStrokeStyle(2, 0xf5c518, 0.8).setDepth(61));
    add(this.add.text(cx, cy - 75, '¡Bienvenido de vuelta!', { fontSize: '20px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(62));
    add(this.add.text(cx, cy - 28, `Estuviste fuera ${timeStr}.\nTus facultades generaron:`, { fontSize: '14px', color: '#c8d0ff', fontFamily: 'Arial', align: 'center' }).setOrigin(0.5).setDepth(62));
    add(this.add.text(cx, cy + 30, `+${fmtNumber(amount)} 🪙`, { fontSize: '32px', color: '#f5c518', fontFamily: 'Orbitron, Arial', fontStyle: 'bold' }).setOrigin(0.5).setDepth(62));
    const btn = add(this.add.rectangle(cx, cy + 82, 150, 38, 0x5c79ff).setInteractive({ cursor: 'pointer' }).setDepth(62));
    const btnTxt = add(this.add.text(cx, cy + 82, '¡Genial!', { fontSize: '16px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(63));
    const close = () => objs.forEach(o => { if (o?.active) o.destroy(); });
    btn.on('pointerdown', close); btnTxt.on('pointerdown', close);
  }

  // ────────────────────────────── TUTORIAL ──────────────────────────────

  _maybeShowCampusRebuiltPopup() {
    maybeShowCampusRebuiltPopup(this);
  }

  _showCampusRebuiltPopup() {
    maybeShowCampusRebuiltPopup(this);
  }

  _scheduleTutorial() {
    if (localStorage.getItem('epn_tutorial_done') && !this.registry.get('tutorial-after-intro')) return;
    if (this.registry.get('intro-pending')) {
      this.game.events.once('intro-finished', () => {
        this.time.delayedCall(450, () => showTutorial(this));
      });
      return;
    }
    this.time.delayedCall(800, () => showTutorial(this));
  }

  _currentTutorialSteps() {
    return [];
  }

  _showTutorial() {
    return showTutorial(this);
    if ((localStorage.getItem('epn_tutorial_done') && !this.registry.get('tutorial-after-intro')) || this._tutorialOpen) return;
    this.registry.set('tutorial-after-intro', false);
    this._tutorialOpen = true;
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;
    const steps = [
      { title: '¡Bienvenido al Campus EPN!', text: 'Construye tu campus universitario,\ngenera monedas y expándete.' },
      { title: 'Paleta de Facultades', text: 'Pulsa el botón ▶ para abrir la paleta.\nArrastra una Facultad hacia una zona\nmarcada del mapa del campus.' },
      { title: 'Genera Monedas 🪙', text: 'Cada facultad produce monedas\nautomáticamente. Haz clic en ella\npara reclamarlas.' },
      { title: 'Quizzes Académicos 🧠', text: 'Cada cierto tiempo aparece un evento\nen el campus. ¡Responde correctamente\ny gana monedas bonus!' },
      { title: 'Mejora y Expande', text: 'Selecciona un edificio y usa "Mejorar"\npara aumentar su producción.\nCompleta misiones para más recompensas.' },
    ];
    steps.splice(0, steps.length, ...this._currentTutorialSteps());
    let step = 0;
    const objs = [];
    const add = o => { objs.push(o); return o; };

    add(this.add.rectangle(cx, cy, W, H, 0x000000, 0.65).setDepth(90));
    add(this.add.rectangle(cx, cy, 500, 290, 0x0d1220).setStrokeStyle(2, 0x5c79ff, 0.8).setDepth(91));
    const titleTxt = add(this.add.text(cx, cy - 88, steps[0].title, {
      fontSize: '18px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(92));
    const bodyTxt = add(this.add.text(cx, cy - 20, steps[0].text, {
      fontSize: '14px', color: '#c8d0ff', fontFamily: 'Arial', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(92));
    const indicator = add(this.add.text(cx, cy + 78, `1 / ${steps.length}`, {
      fontSize: '12px', color: '#4a5a7a', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(92));
    const btn = add(this.add.rectangle(cx, cy + 112, 180, 38, 0x5c79ff).setInteractive({ cursor: 'pointer' }).setDepth(92));
    const btnTxt = add(this.add.text(cx, cy + 112, 'Siguiente ->', {
      fontSize: '15px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(93));

    const advance = () => {
      step++;
      if (step >= steps.length) {
        objs.forEach(o => { if (o?.active) o.destroy(); });
        localStorage.setItem('epn_tutorial_done', '1');
        this._tutorialOpen = false;
        return;
      }
      titleTxt.setText(steps[step].title);
      bodyTxt.setText(steps[step].text);
      indicator.setText(`${step + 1} / ${steps.length}`);
      if (step === steps.length - 1) btnTxt.setText('Empezar');
    };
    btn.on('pointerdown', advance); btnTxt.on('pointerdown', advance);
  }

  // ────────────────────────────── RESET ──────────────────────────────

  _confirmReset() {
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;
    const objs = [];
    const add = o => { objs.push(o); return o; };
    const close = () => objs.forEach(o => { if (o?.active) o.destroy(); });

    add(this.add.rectangle(cx, cy, W, H, 0x000000, 0.6).setDepth(80));
    add(this.add.rectangle(cx, cy, 360, 180, 0x0d1220).setStrokeStyle(2, 0xff5555, 0.8).setDepth(81));
    add(this.add.text(cx, cy - 52, '¿Borrar partida?', { fontSize: '18px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ff8888' }).setOrigin(0.5).setDepth(82));
    add(this.add.text(cx, cy - 8, 'Se perderá todo el progreso.\nEsta acción no se puede deshacer.', { fontSize: '13px', color: '#c8d0ff', fontFamily: 'Arial', align: 'center' }).setOrigin(0.5).setDepth(82));

    const yesBtn = add(this.add.rectangle(cx - 70, cy + 50, 120, 36, 0xcc3333).setInteractive({ cursor: 'pointer' }).setDepth(82));
    add(this.add.text(cx - 70, cy + 50, 'Sí, borrar', { fontSize: '14px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(83))
      .on('pointerdown', () => { close(); this.game.events.emit('ui:clear-save'); });
    yesBtn.on('pointerdown', () => { close(); this.game.events.emit('ui:clear-save'); });

    const noBtn = add(this.add.rectangle(cx + 70, cy + 50, 120, 36, 0x2a3860).setInteractive({ cursor: 'pointer' }).setDepth(82));
    add(this.add.text(cx + 70, cy + 50, 'Cancelar', { fontSize: '14px', color: '#c8d0ff', fontFamily: 'Arial', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(83))
      .on('pointerdown', close);
    noBtn.on('pointerdown', close);
  }

  // ────────────────────────────── EVENT BINDINGS ──────────────────────────────

  _bindEvents() {
    const ev = this.game.events;

    ev.on('coins-updated',    () => this._updateHUD());
    ev.on('production-tick',  () => this._updateHUD());
    ev.on('building-placed',  () => {
      this._updateHUD();
      this._maybeShowCampusRebuiltPopup();
    });
    ev.on('building-upgraded',() => this._updateHUD());
    ev.on('mission-done',     m  => {
      this._updateMissionsPanel();
      this._queueToast({
        title: '✅  ¡Misión completada!',
        body:  `${m.text}  →  +${fmtNumber(m.reward)} 🪙`,
        bg: 0x1a3a20, border: 0x55dd77, titleColor: '#88ff99', bodyColor: '#ccffcc', y: 300,
      });
      this._updateHUD();
    });
    ev.on('achievement', ach => {
      this._queueToast({
        title: `🏆 ${ach.title}`,
        body:  ach.desc,
        bg: 0x1a2a40, border: 0xf5c518, titleColor: '#f5c518', bodyColor: '#c8d0ff', y: 130,
      });
    });
    ev.on('status-message', msg => this._setStatus(msg, 4000));
    ev.on('building-selected', ({ spotId, bData }) => {
      this._selectedSpot = spotId;
      this._updateUpgradePanel();
    });
    ev.on('event:quiz-open', d => this._showQuiz(d));
    ev.on('offline-earnings', d => this._showOfflinePopup(d));
  }
}
