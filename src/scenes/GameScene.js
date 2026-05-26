import Phaser from 'phaser';
import { BUILDING_TYPES } from '../data/BuildingTypes.js';
import { DROP_SPOTS }     from '../data/DropSpots.js';
import {
  MAX_BUILDING_LEVEL,
  MAX_STUDENTS_PER_BUILDING,
  passiveCoinsPerStudent,
  passiveCoinsPerTick,
  studentCost,
  upgradeCost,
  upgradedClickIncome,
} from '../data/Economy.js';
import StudentManager from '../objects/StudentManager.js';

const WORLD_W = 3000;
const WORLD_H = 2200;
const DEBUG_SHOW_DROP_SPOTS = false;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'game' });
    this._objs      = {};   // spotId -> {img, labelBg, levelTxt, unclaimedTxt, prodTimer}
    this._dropGfx   = {};   // spotId → Graphics
    this._dropTxt   = {};   // spotId → Text
    this._dropHandles = {};
    this._dropCenterHandles = {};
    this._studentManager = null;
    this._selectedSpot = null;
    this._eventTimer = null;
    this._activeEventIcon = null;
  }

  create() {
    this._state    = this.registry.get('state');
    this._save     = this.registry.get('save');
    this._missions = this.registry.get('missions');
    this._events   = this.registry.get('events');
    this._studentManager = new StudentManager(this, this._state, {
      worldW: WORLD_W,
      worldH: WORLD_H,
      spotPts: spot => this._spotPts(spot),
    });

    this._buildWorld();
    this._buildCamera();
    this._buildDropSpotEditor();
    this._bindGameEvents();
    this._restoreFromState();

    // Auto-save every 60s
    this.time.addEvent({ delay: 60000, loop: true, callback: () => this._doSave() });
    // Event system scheduling
    this.game.events.off('event:schedule');
    this.game.events.off('event:spawn');
    this.game.events.on('event:schedule', ({ delay }) => {
      if (this._eventTimer) this._eventTimer.remove(false);
      this._eventTimer = this.time.delayedCall(delay, () => {
        this._eventTimer = null;
        this._events.onTimerFired();
      });
    });
    this.game.events.on('event:spawn', d => this._spawnEventIcon(d));

    this._events.start();
    this.cameras.main.fadeIn(400);
  }

  // ── World ───────────────────────────────────────────────────

  _buildWorld() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor(0x10131c);
    this.cameras.main.setZoom(0.65);
    this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);

    this.add.image(WORLD_W / 2, WORLD_H / 2, 'campus').setDisplaySize(WORLD_W, WORLD_H);

    DROP_SPOTS.forEach(spot => {
      const gfx = this.add.graphics();
      this._dropGfx[spot.id] = gfx;
      this._drawSpot(spot.id, false);
      gfx.setVisible(DEBUG_SHOW_DROP_SPOTS);

      const txt = this.add.text(spot.x, spot.y, 'Construir aquí', {
        fontSize: '20px', color: '#d6e0ff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(DEBUG_SHOW_DROP_SPOTS);
      this._dropTxt[spot.id] = txt;
    });
  }

  _drawSpot(id, hi) {
    const gfx  = this._dropGfx[id];
    const spot = DROP_SPOTS.find(s => s.id === id);
    if (!gfx || !spot) return;
    const pts = this._spotPts(spot);
    gfx.clear();
    gfx.fillStyle(hi ? 0x5c79ff : 0xffffff, hi ? 0.22 : 0.08);
    gfx.lineStyle(hi ? 4 : 3, hi ? 0xffffff : 0x9eb1ff, hi ? 0.4 : 0.25);
    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.closePath(); gfx.fillPath(); gfx.strokePath();
  }

  _spotPts(spot) {
    if (spot.points) return spot.points;

    const halfW = spot.halfW ?? 230;
    const halfH = spot.halfH ?? 145;
    return [
      { x: spot.x, y: spot.y - halfH },
      { x: spot.x + halfW, y: spot.y },
      { x: spot.x, y: spot.y + halfH },
      { x: spot.x - halfW, y: spot.y },
    ];
  }

  _insideSpot(id, x, y) {
    const spot = DROP_SPOTS.find(s => s.id === id);
    if (!spot) return false;
    return Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(this._spotPts(spot)), x, y);
  }

  // ── Camera ──────────────────────────────────────────────────

  _buildDropSpotEditor() {
    if (!DEBUG_SHOW_DROP_SPOTS) return;

    DROP_SPOTS.forEach(spot => {
      if (!spot.points) spot.points = this._spotPts(spot).map(p => ({ ...p }));
      this._dropHandles[spot.id] = spot.points.map((pt, index) => this._createDropVertexHandle(spot, pt, index));
      this._dropCenterHandles[spot.id] = this._createDropCenterHandle(spot);
    });

    Object.defineProperty(window, 'coordenadas', {
      configurable: true,
      get: () => {
        const code = this._formatDropSpotCoordinates();
        console.log(code);
        return code;
      },
    });
  }

  _createDropVertexHandle(spot, point, index) {
    const colors = [0xff4d6d, 0x4da3ff, 0xffd34d, 0x57e389];
    const handle = this.add.rectangle(point.x, point.y, 26, 26, colors[index], 0.95)
      .setStrokeStyle(3, 0xffffff, 0.95)
      .setDepth(20)
      .setInteractive({ cursor: 'grab', draggable: true });

    const label = this.add.text(point.x, point.y, `${spot.id}.${index}`, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21);

    this.input.setDraggable(handle);

    handle.on('pointerdown', () => {
      this.registry.set('debug-dragging-drop-vertex', true);
      handle.setScale(1.15);
    });

    handle.on('drag', pointer => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      point.x = Math.round(world.x);
      point.y = Math.round(world.y);
      handle.setPosition(point.x, point.y);
      label.setPosition(point.x, point.y);
      this._drawSpot(spot.id, false);
    });

    handle.on('dragend', () => {
      this.registry.set('debug-dragging-drop-vertex', false);
      handle.setScale(1);
      console.log(`[drop-spot:${spot.typeId}] vertice ${index}`, { x: point.x, y: point.y });
    });

    return { handle, label };
  }

  _createDropCenterHandle(spot) {
    const handle = this.add.circle(spot.x, spot.y, 18, 0x00e5ff, 0.95)
      .setStrokeStyle(4, 0xffffff, 0.95)
      .setDepth(22)
      .setInteractive({ cursor: 'grab', draggable: true });

    const label = this.add.text(spot.x, spot.y - 30, `${spot.id}.C`, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(23);

    this.input.setDraggable(handle);

    handle.on('pointerdown', () => {
      this.registry.set('debug-dragging-drop-vertex', true);
      handle.setScale(1.15);
    });

    handle.on('drag', pointer => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      spot.x = Math.round(world.x);
      spot.y = Math.round(world.y);
      handle.setPosition(spot.x, spot.y);
      label.setPosition(spot.x, spot.y - 30);
      this._dropTxt[spot.id]?.setPosition(spot.x, spot.y);
    });

    handle.on('dragend', () => {
      this.registry.set('debug-dragging-drop-vertex', false);
      handle.setScale(1);
      console.log(`[drop-spot:${spot.typeId}] centro`, { x: spot.x, y: spot.y });
    });

    return { handle, label };
  }

  _formatDropSpotCoordinates() {
    const lines = ['export const DROP_SPOTS = ['];

    DROP_SPOTS.forEach(spot => {
      lines.push('  {');
      lines.push(`    id: ${spot.id},`);
      lines.push(`    typeId: '${spot.typeId}',`);
      lines.push(`    x: ${Math.round(spot.x)},`);
      lines.push(`    y: ${Math.round(spot.y)},`);
      lines.push('    points: [');
      this._spotPts(spot).forEach(point => {
        lines.push(`      { x: ${Math.round(point.x)}, y: ${Math.round(point.y)} },`);
      });
      lines.push('    ],');
      lines.push('  },');
    });

    lines.push('];');
    return lines.join('\n');
  }

  _spotForType(typeId) {
    return DROP_SPOTS.find(s => s.typeId === typeId);
  }

  _nextBuildingType() {
    return BUILDING_TYPES.find(type =>
      !Object.values(this._state.placedBuildings).some(b => b.typeId === type.id)
    );
  }

  _buildCamera() {
    this._clampZoom();
    this._clampCamera();

    this.scale.on('resize', () => {
      this._clampZoom();
      this._clampCamera();
    });

    this._keys = this.input.keyboard.addKeys({
      up:'W', down:'S', left:'A', right:'D',
      up2:'UP', down2:'DOWN', left2:'LEFT', right2:'RIGHT',
    });

    this.input.on('wheel', (ptr, objs, dx, dy) => {
      if (this.registry.get('ui-blocking')) return;
      const cam = this.cameras.main;
      cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, this._getMinZoom(), 1.6);
      this._clampCamera();
    });

    let panStartX = 0, panStartY = 0, panning = false;

    this.input.on('pointerdown', ptr => {
      if (this.registry.get('ui-blocking')) return;
      panning   = true;
      panStartX = ptr.x;
      panStartY = ptr.y;
    });
    this.input.on('pointermove', ptr => {
      if (!ptr.isDown || !panning || this.registry.get('ui-dragging') || this.registry.get('debug-dragging-drop-vertex')) return;
      const cam = this.cameras.main;
      cam.scrollX -= (ptr.x - panStartX) / cam.zoom;
      cam.scrollY -= (ptr.y - panStartY) / cam.zoom;
      this._clampCamera();
      panStartX = ptr.x; panStartY = ptr.y;
    });
    this.input.on('pointerup', () => { panning = false; });
  }

  update(time, delta) {
    const cam = this.cameras.main;
    const spd = 6 / cam.zoom;
    const k   = this._keys;
    if (k.left.isDown  || k.left2.isDown)  cam.scrollX -= spd;
    if (k.right.isDown || k.right2.isDown) cam.scrollX += spd;
    if (k.up.isDown    || k.up2.isDown)    cam.scrollY -= spd;
    if (k.down.isDown  || k.down2.isDown)  cam.scrollY += spd;
    this._clampCamera();
    this._updateStudents(delta);
  }

  _getMinZoom() {
    return Math.max(this.scale.width / WORLD_W, this.scale.height / WORLD_H);
  }

  _clampZoom() {
    const cam = this.cameras.main;
    cam.zoom = Phaser.Math.Clamp(cam.zoom, this._getMinZoom(), 1.6);
  }

  _clampCamera() {
    const cam = this.cameras.main;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;

    if (viewW >= WORLD_W) {
      cam.scrollX = (WORLD_W - viewW) / 2;
    } else {
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, WORLD_W - viewW);
    }

    if (viewH >= WORLD_H) {
      cam.scrollY = (WORLD_H - viewH) / 2;
    } else {
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, WORLD_H - viewH);
    }
  }

  // ── Event bindings ──────────────────────────────────────────

  _bindGameEvents() {
    const ev = this.game.events;

    ev.on('ui:drop-building', ({ worldX, worldY, typeId }) => {
      const nextType = this._nextBuildingType();
      if (nextType && nextType.id !== typeId) {
        ev.emit('status-message', `Primero construye ${nextType.name}.`);
        return;
      }

      const spot = this._spotForType(typeId);
      if (!spot) return;

      if (this._state.placedBuildings[spot.id]) {
        ev.emit('status-message', 'Ese edificio ya fue construido en su lugar asignado.');
        return;
      }

      if (this._insideSpot(spot.id, worldX, worldY)) {
        this._placeBuilding(spot.id, typeId);
        return;
      }
      ev.emit('status-message', 'Arrastra el edificio a su zona marcada del campus.');
    });

    ev.on('ui:drag-over', ({ worldX, worldY, typeId }) => {
      const targetSpot = this._spotForType(typeId);
      DROP_SPOTS.forEach(s => {
        if (this._state.placedBuildings[s.id] || s.id !== targetSpot?.id) {
          this._dropGfx[s.id]?.setVisible(DEBUG_SHOW_DROP_SPOTS);
          this._dropTxt[s.id]?.setVisible(DEBUG_SHOW_DROP_SPOTS);
          return;
        }
        const hi = this._insideSpot(s.id, worldX, worldY);
        this._drawSpot(s.id, hi);
        this._dropGfx[s.id]?.setVisible(true);
        if (this._dropTxt[s.id]) {
          this._dropTxt[s.id].setVisible(true);
          this._dropTxt[s.id].setColor(hi ? '#ffffff' : '#d6e0ff');
        }
      });
    });

    ev.on('ui:clear-highlights', () => {
      DROP_SPOTS.forEach(s => {
        if (!this._state.placedBuildings[s.id]) {
          this._drawSpot(s.id, false);
          this._dropGfx[s.id]?.setVisible(DEBUG_SHOW_DROP_SPOTS);
          if (this._dropTxt[s.id]) {
            this._dropTxt[s.id].setVisible(DEBUG_SHOW_DROP_SPOTS);
            this._dropTxt[s.id].setColor('#d6e0ff');
          }
        }
      });
    });

    ev.on('ui:upgrade', ({ spotId }) => this._upgradeBuilding(spotId));
    ev.on('ui:admit-student', ({ spotId }) => this._admitStudent(spotId));
    ev.on('ui:select',  ({ spotId }) => this._selectBuilding(spotId));
    ev.on('ui:save',    () => this._doSave(true));
    ev.on('ui:clear-save', () => {
      this.registry.get('save').clear();
      this.registry.set('has-save', false);
      localStorage.setItem('epn_intro_required', '1');
      this.scene.stop('ui');
      this.scene.stop('dialogue');
      this.scene.start('boot');
    });
  }

  // ── Building placement ──────────────────────────────────────

  _placeBuilding(spotId, typeId, fromSave = false) {
    const spot = DROP_SPOTS.find(s => s.id === spotId);
    const type = BUILDING_TYPES.find(t => t.id === typeId);
    if (!spot || !type) return;

    if (!fromSave) this._state.coins -= type.placeCost;

    // Remove drop zone
    if (this._dropGfx[spotId]) { this._dropGfx[spotId].destroy(); delete this._dropGfx[spotId]; }
    if (this._dropTxt[spotId]) { this._dropTxt[spotId].destroy(); delete this._dropTxt[spotId]; }
    if (this._dropHandles[spotId]) {
      this._dropHandles[spotId].forEach(({ handle, label }) => {
        handle.destroy();
        label.destroy();
      });
      delete this._dropHandles[spotId];
    }
    if (this._dropCenterHandles[spotId]) {
      this._dropCenterHandles[spotId].handle.destroy();
      this._dropCenterHandles[spotId].label.destroy();
      delete this._dropCenterHandles[spotId];
    }

    // State data
    if (!fromSave) {
      this._state.placedBuildings[spotId] = {
        typeId, level: 1,
        coinsPerTick: type.coinsPerTick,
        productionInterval: type.productionInterval,
        students: 0,
        unclaimed: 0,
      };
    }
    const bData = this._state.placedBuildings[spotId];
    bData.students = bData.students ?? 0;
    bData.unclaimed = 0;

    // ── Phaser objects ──
    const img = this.add.image(spot.x, spot.y, type.texture)
      .setDisplaySize(type.displaySize?.width ?? 300, type.displaySize?.height ?? 300).setTint(type.tint)
      .setDepth(type.renderDepth ?? 2)
      .setInteractive({ cursor: 'pointer', pixelPerfect: true, alphaTolerance: 1 });

    // Capturar la escala correcta ANTES de resetear para la animación
    const targetScaleX = img.scaleX;
    const targetScaleY = img.scaleY;

    if (!fromSave) {
      img.setScale(0);
      this.tweens.add({ targets: img, scaleX: targetScaleX, scaleY: targetScaleY, duration: 450, ease: 'Back.easeOut' });
    }

    const labelBg = this.add.graphics();
    const levelTxt = this.add.text(spot.x, spot.y + 68, `Nv.1  ${type.name}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);
    this._drawBuildingLabel(labelBg, levelTxt, type.color);
    labelBg.setVisible(false);
    levelTxt.setVisible(false);

    const unclaimedTxt = this.add.text(spot.x, spot.y - 70, '', {
      fontSize: '18px', color: '#f5c518', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    const prodTimer = this.time.addEvent({
      delay: bData.productionInterval, loop: true,
      callback: () => {
        const amount = this._passiveCoinsPerTick(bData);
        if (amount <= 0) return;
        this._addCoins(amount);
        this._floatCoin(spot.x, spot.y, amount);
        this.game.events.emit('production-tick');
      },
    });

    img.on('pointerdown', () => {
      this._clickBuilding(spotId);
      this._selectBuilding(spotId);
    });

    // Hover tooltip hint
    img.on('pointerover', () => {
      this.game.events.emit('status-message',
        `${type.name} Nv.${bData.level} · ${bData.coinsPerTick}🪙/${(bData.productionInterval/1000).toFixed(1)}s`);
    });

    this._objs[spotId] = { img, labelBg, levelTxt, unclaimedTxt, prodTimer };
    if (fromSave) {
      levelTxt.setText(`Nv.${bData.level}  ${type.name}`);
      this._drawBuildingLabel(labelBg, levelTxt, type.color);
      this._refreshUnclaimed(spotId);
    }

    if (!fromSave) {
      this._createStudents();
      this._missions.onAction('totalBuildings');
      this._doSave();
      this.game.events.emit('building-placed', { spotId, typeId });
      this.game.events.emit('coins-updated');
      this.game.events.emit('status-message', 'Facultad construida. Haz clic en ella para generar monedas.');
    }
  }

  // ── Coins ───────────────────────────────────────────────────

  _drawBuildingLabel(gfx, txt, color) {
    const padX = 10;
    const padY = 5;
    const bounds = txt.getBounds();
    const x = bounds.x - padX;
    const y = bounds.y - padY;
    const w = bounds.width + padX * 2;
    const h = bounds.height + padY * 2;

    gfx.clear();
    gfx.fillStyle(0x07101c, 0.78);
    gfx.fillRoundedRect(x, y, w, h, 7);
    gfx.lineStyle(2, color, 0.9);
    gfx.strokeRoundedRect(x, y, w, h, 7);
    gfx.setDepth(4);
  }

  _clickBuilding(spotId) {
    const bData = this._state.placedBuildings[spotId];
    if (!bData) return;
    const amount = Math.max(1, bData.coinsPerTick);
    this._addCoins(amount);
    this._popText(spotId, amount);
    this._doSave();
  }

  _addCoins(amount) {
    this._state.coins += amount;
    this._state.totalCoinsEarned += amount;
    this._state.missions.progress.totalCoinsEarned += amount;
    this._missions.onAction('totalCoinsEarned');
    this.game.events.emit('coins-updated');
  }

  _passiveCoinsPerStudent(bData) {
    return passiveCoinsPerStudent(bData);
  }

  _passiveCoinsPerTick(bData) {
    return passiveCoinsPerTick(bData);
  }

  _studentCost(type, bData) {
    return studentCost(type, bData);
  }

  _upgradeCost(type, bData) {
    return upgradeCost(type, bData);
  }

  _refreshUnclaimed(spotId) {
    const bData = this._state.placedBuildings[spotId];
    const objs  = this._objs[spotId];
    if (!bData || !objs) return;
    objs.unclaimedTxt.setText('');
  }

  _popText(spotId, amount) {
    const spot = DROP_SPOTS.find(s => s.id === spotId);
    if (!spot) return;
    const t = this.add.text(spot.x, spot.y - 80, `+${amount} 🪙`, {
      fontSize: '24px', color: '#f5c518', fontFamily: 'Orbitron, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, duration: 1000, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  _floatCoin(x, y, amount) {
    const dx = Phaser.Math.Between(-30, 30);
    const t  = this.add.text(x + dx, y - 100, `+${amount} 🪙`, {
      fontSize: '24px', color: '#f5c518', fontFamily: 'Orbitron, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, duration: 1000, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ── Upgrade ─────────────────────────────────────────────────

  _upgradeBuilding(spotId) {
    const bData = this._state.placedBuildings[spotId];
    if (!bData) return;
    const type = BUILDING_TYPES.find(t => t.id === bData.typeId);
    if (bData.level >= MAX_BUILDING_LEVEL) {
      this.game.events.emit('status-message', `${type.name} ya esta en el nivel maximo.`);
      this.game.events.emit('building-selected', { spotId, bData });
      return;
    }
    const cost = this._upgradeCost(type, bData);

    if (this._state.coins < cost) {
      this.game.events.emit('status-message', `Necesitas ${cost} 🪙 para mejorar.`);
      return;
    }

    this._state.coins    -= cost;
    bData.level          += 1;
    bData.coinsPerTick    = upgradedClickIncome(bData);
    bData.productionInterval = type.productionInterval;
    this._state.totalUpgrades++;

    const objs = this._objs[spotId];
    const spot = DROP_SPOTS.find(s => s.id === spotId);

    objs.prodTimer.remove(false);
    objs.prodTimer = this.time.addEvent({
      delay: bData.productionInterval, loop: true,
      callback: () => {
        const amount = this._passiveCoinsPerTick(bData);
        if (amount <= 0) return;
        this._addCoins(amount);
        this._floatCoin(spot.x, spot.y, amount);
        this.game.events.emit('production-tick');
      },
    });

    objs.levelTxt.setText(`Nv.${bData.level}  ${type.name}`);
    this._drawBuildingLabel(objs.labelBg, objs.levelTxt, type.color);
    this._flashBuilding(objs.img);

    this._state.missions.progress.totalUpgrades = this._state.totalUpgrades;
    this._missions.onAction('totalUpgrades');
    this._doSave();
    this.game.events.emit('coins-updated');
    this.game.events.emit('building-upgraded', { spotId });
    this.game.events.emit('status-message', `¡${type.name} mejorada al Nivel ${bData.level}!`);

    // Re-emit select to refresh sidebar info
    this.game.events.emit('building-selected', { spotId, bData });
  }

  // ── Selection ───────────────────────────────────────────────

  _admitStudent(spotId) {
    const bData = this._state.placedBuildings[spotId];
    if (!bData) return;
    const type = BUILDING_TYPES.find(t => t.id === bData.typeId);
    if ((bData.students ?? 0) >= MAX_STUDENTS_PER_BUILDING) {
      this.game.events.emit('status-message', `${type.name} ya tiene el maximo de estudiantes.`);
      this.game.events.emit('building-selected', { spotId, bData });
      return;
    }
    const cost = this._studentCost(type, bData);

    if (this._state.coins < cost) {
      this.game.events.emit('status-message', `Necesitas ${cost} monedas para admitir estudiante.`);
      return;
    }

    this._state.coins -= cost;
    bData.students = (bData.students ?? 0) + 1;
    bData.unclaimed = 0;

    this._createStudents();
    this._doSave();
    this.game.events.emit('coins-updated');
    this.game.events.emit('building-student-admitted', { spotId });
    this.game.events.emit('status-message', `${type.name}: estudiante admitido.`);
    this.game.events.emit('building-selected', { spotId, bData });
  }

  _flashBuilding(img) {
    this.tweens.killTweensOf(img);
    img.setAlpha(1);
    this.tweens.add({
      targets: img,
      alpha: 0.35,
      duration: 80,
      yoyo: true,
      repeat: 4,
      onComplete: () => img.setAlpha(1),
      onStop: () => img.setAlpha(1),
    });
  }

  _selectBuilding(spotId) {
    this._selectedSpot = spotId;
    Object.entries(this._objs).forEach(([id, o]) => {
      const selected = parseInt(id) === spotId;
      o.labelBg?.setVisible(selected);
      o.levelTxt?.setVisible(selected);
    });
    this.game.events.emit('building-selected', {
      spotId,
      bData: this._state.placedBuildings[spotId],
    });
  }

  // ── Students ────────────────────────────────────────────────

  _createStudents() {
    this._studentManager?.sync();
  }

  _updateStudents(delta = 16) {
    this._studentManager?.update(delta);
  }

  // ── Campus events ────────────────────────────────────────────

  _spawnEventIcon({ pos, facultyId, data, question }) {
    if (this._activeEventIcon?.active) {
      this._activeEventIcon.destroy();
    }

    const container = this.add.container(pos.x, pos.y);
    this._activeEventIcon = container;

    const glow = this.add.graphics();
    glow.fillStyle(data.color, 0.18);
    glow.fillCircle(0, 0, 48);

    const ring = this.add.graphics();
    ring.lineStyle(3, data.color, 0.9);
    ring.strokeCircle(0, 0, 48);

    const icon = this.add.text(0, -6, data.icon, { fontSize: '28px' }).setOrigin(0.5);
    const bang = this.add.text(18, -28, '!', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const barBg   = this.add.rectangle(0, 50, 80, 8, 0x1e2844);
    const barFill = this.add.rectangle(-40, 50, 80, 6, data.color).setOrigin(0, 0.5);

    const lbl = this.add.text(0, 68, data.eventName, {
      fontSize: '13px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5);

    const hit = this.add.rectangle(0, 10, 110, 110, 0xffffff, 0.001)
      .setInteractive({ cursor: 'pointer' });

    container.add([glow, ring, icon, bang, barBg, barFill, lbl, hit]);

    this.tweens.add({ targets: glow, scaleX: 1.4, scaleY: 1.4, alpha: 0.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: bang, y: -34, duration: 400, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: barFill, width: 0, duration: 12000, ease: 'Linear' });

    const timeout = this.time.delayedCall(12000, () => {
      if (container.active) container.destroy();
      if (this._activeEventIcon === container) this._activeEventIcon = null;
      this._events.closeQuiz();
    });

    hit.on('pointerover', () => { ring.clear(); ring.lineStyle(4, 0xffffff, 1); ring.strokeCircle(0, 0, 48); });
    hit.on('pointerout',  () => { ring.clear(); ring.lineStyle(3, data.color, 0.9); ring.strokeCircle(0, 0, 48); });
    hit.on('pointerdown', () => {
      timeout.remove(false);
      container.destroy();
      if (this._activeEventIcon === container) this._activeEventIcon = null;
      this._events.openQuiz(facultyId, question);
    });
  }

  // ── Restore ──────────────────────────────────────────────────

  _restoreFromState() {
    const buildings = this._state.placedBuildings;
    Object.entries(buildings).forEach(([sid, bData]) => {
      this._placeBuilding(parseInt(sid), bData.typeId, true);
    });

    if (Object.keys(buildings).length > 0) {
      this._createStudents();
      this._calcOfflineEarnings();
    }
  }

  _calcOfflineEarnings() {
    const last = this._state.lastSaved;
    if (!last) return;
    const elapsed = (Date.now() - last) / 1000;
    if (elapsed < 15) return;

    let offline = 0;
    Object.values(this._state.placedBuildings).forEach(b => {
      offline += Math.floor((this._passiveCoinsPerTick(b) / (b.productionInterval / 1000)) * Math.min(elapsed, 7200));
    });
    if (offline > 0) {
      this._addCoins(offline);
      this.game.events.emit('offline-earnings', { amount: offline, seconds: elapsed });
    }
  }

  // ── Save ─────────────────────────────────────────────────────

  _doSave(feedback = false) {
    this._save.save(this._state);
    if (feedback) this.game.events.emit('status-message', 'Partida guardada ✓');
  }

  // Public helper for UIScene to get world point
  getWorldPoint(screenX, screenY) {
    return this.cameras.main.getWorldPoint(screenX, screenY);
  }
}
