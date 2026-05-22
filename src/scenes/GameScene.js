import Phaser from 'phaser';
import { BUILDING_TYPES } from '../data/BuildingTypes.js';
import { DROP_SPOTS }     from '../data/DropSpots.js';

const WORLD_W = 3000;
const WORLD_H = 2200;

const STUDENT_PATHS = [
  [{x:550,y:1060},{x:900,y:1040},{x:1200,y:1020},{x:1500,y:1010},{x:1800,y:1020},{x:2100,y:1040},{x:2450,y:1060}],
  [{x:700,y:850}, {x:1000,y:830},{x:1300,y:820},{x:1500,y:818},{x:1700,y:830},{x:2000,y:850},{x:2300,y:870}],
  [{x:1200,y:1200},{x:1350,y:1290},{x:1500,y:1370},{x:1650,y:1290},{x:1800,y:1200}],
  [{x:900,y:780}, {x:900,y:900},{x:900,y:1040},{x:900,y:1180}],
  [{x:2100,y:780},{x:2100,y:900},{x:2100,y:1040},{x:2100,y:1180}],
];

const STUDENT_TYPES = [
  { color: 0xffcc44, r: 7, spd: 320 },
  { color: 0x44aaff, r: 7, spd: 420 },
  { color: 0x55dd77, r: 6, spd: 280 },
  { color: 0xff88bb, r: 6, spd: 360 },
  { color: 0xffffff, r: 8, spd: 500 },
];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'game' });
    this._objs      = {};   // spotId → {img, selGfx, levelTxt, unclaimedTxt, progressBg, progressBar, prodTimer, progTimer}
    this._dropGfx   = {};   // spotId → Graphics
    this._dropTxt   = {};   // spotId → Text
    this._students  = [];
    this._selectedSpot = null;
  }

  create() {
    this._state    = this.registry.get('state');
    this._save     = this.registry.get('save');
    this._missions = this.registry.get('missions');
    this._events   = this.registry.get('events');

    this._buildWorld();
    this._buildCamera();
    this._bindGameEvents();
    this._restoreFromState();

    // Auto-save every 60s
    this.time.addEvent({ delay: 60000, loop: true, callback: () => this._doSave() });
    // Event system scheduling
    this.game.events.on('event:schedule', ({ delay }) => {
      this.time.delayedCall(delay, () => this._events.onTimerFired());
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

      const txt = this.add.text(spot.x, spot.y, 'Construir aquí', {
        fontSize: '20px', color: '#d6e0ff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      this._dropTxt[spot.id] = txt;
    });
  }

  _drawSpot(id, hi) {
    const gfx  = this._dropGfx[id];
    const spot = DROP_SPOTS.find(s => s.id === id);
    if (!gfx || !spot) return;
    const pts = this._spotPts(spot.x, spot.y);
    gfx.clear();
    gfx.fillStyle(hi ? 0x5c79ff : 0xffffff, hi ? 0.22 : 0.08);
    gfx.lineStyle(hi ? 4 : 3, hi ? 0xffffff : 0x9eb1ff, hi ? 0.4 : 0.25);
    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.closePath(); gfx.fillPath(); gfx.strokePath();
  }

  _spotPts(cx, cy) {
    return [{x:cx, y:cy-145},{x:cx+230,y:cy},{x:cx,y:cy+145},{x:cx-230,y:cy}];
  }

  _insideSpot(id, x, y) {
    const spot = DROP_SPOTS.find(s => s.id === id);
    if (!spot) return false;
    return Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(this._spotPts(spot.x, spot.y)), x, y);
  }

  // ── Camera ──────────────────────────────────────────────────

  _buildCamera() {
    this._keys = this.input.keyboard.addKeys({
      up:'W', down:'S', left:'A', right:'D',
      up2:'UP', down2:'DOWN', left2:'LEFT', right2:'RIGHT',
    });

    this.input.on('wheel', (ptr, objs, dx, dy) => {
      const cam = this.cameras.main;
      cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.3, 1.6);
    });

    let panStartX = 0, panStartY = 0, panning = false;

    this.input.on('pointerdown', ptr => {
      if (this.registry.get('ui-blocking')) return;
      panning   = true;
      panStartX = ptr.x;
      panStartY = ptr.y;
    });
    this.input.on('pointermove', ptr => {
      if (!ptr.isDown || !panning || this.registry.get('ui-dragging')) return;
      const cam = this.cameras.main;
      cam.scrollX -= (ptr.x - panStartX) / cam.zoom;
      cam.scrollY -= (ptr.y - panStartY) / cam.zoom;
      panStartX = ptr.x; panStartY = ptr.y;
    });
    this.input.on('pointerup', () => { panning = false; });
  }

  update() {
    const cam = this.cameras.main;
    const spd = 6 / cam.zoom;
    const k   = this._keys;
    if (k.left.isDown  || k.left2.isDown)  cam.scrollX -= spd;
    if (k.right.isDown || k.right2.isDown) cam.scrollX += spd;
    if (k.up.isDown    || k.up2.isDown)    cam.scrollY -= spd;
    if (k.down.isDown  || k.down2.isDown)  cam.scrollY += spd;
  }

  // ── Event bindings ──────────────────────────────────────────

  _bindGameEvents() {
    const ev = this.game.events;

    ev.on('ui:drop-building', ({ worldX, worldY, typeId }) => {
      for (const spot of DROP_SPOTS) {
        if (!this._state.placedBuildings[spot.id] && this._insideSpot(spot.id, worldX, worldY)) {
          this._placeBuilding(spot.id, typeId);
          return;
        }
      }
      ev.emit('status-message', 'Arrastra el edificio a una zona marcada del campus.');
    });

    ev.on('ui:drag-over', ({ worldX, worldY }) => {
      DROP_SPOTS.forEach(s => {
        if (this._state.placedBuildings[s.id]) return;
        const hi = this._insideSpot(s.id, worldX, worldY);
        this._drawSpot(s.id, hi);
        if (this._dropTxt[s.id]) this._dropTxt[s.id].setColor(hi ? '#ffffff' : '#d6e0ff');
      });
    });

    ev.on('ui:clear-highlights', () => {
      DROP_SPOTS.forEach(s => {
        if (!this._state.placedBuildings[s.id]) {
          this._drawSpot(s.id, false);
          if (this._dropTxt[s.id]) this._dropTxt[s.id].setColor('#d6e0ff');
        }
      });
    });

    ev.on('ui:upgrade', ({ spotId }) => this._upgradeBuilding(spotId));
    ev.on('ui:select',  ({ spotId }) => this._selectBuilding(spotId));
    ev.on('ui:claim',   ({ spotId }) => this._claimCoins(spotId));
    ev.on('ui:save',    () => this._doSave(true));
    ev.on('ui:clear-save', () => {
      this.registry.get('save').clear();
      this.scene.stop('ui');
      this.scene.start('boot');
    });
  }

  // ── Building placement ──────────────────────────────────────

  _placeBuilding(spotId, typeId, fromSave = false) {
    const spot = DROP_SPOTS.find(s => s.id === spotId);
    const type = BUILDING_TYPES.find(t => t.id === typeId);

    if (!fromSave) this._state.coins -= type.placeCost;

    // Remove drop zone
    if (this._dropGfx[spotId]) { this._dropGfx[spotId].destroy(); delete this._dropGfx[spotId]; }
    if (this._dropTxt[spotId]) { this._dropTxt[spotId].destroy(); delete this._dropTxt[spotId]; }

    // State data
    if (!fromSave) {
      this._state.placedBuildings[spotId] = {
        typeId, level: 1,
        coinsPerTick: type.coinsPerTick,
        productionInterval: type.productionInterval,
        unclaimed: 0,
      };
    }
    const bData = this._state.placedBuildings[spotId];

    // ── Phaser objects ──
    const img = this.add.image(spot.x, spot.y, 'building')
      .setDisplaySize(300, 300).setTint(type.tint)
      .setInteractive({ cursor: 'pointer' });

    // Capturar la escala correcta ANTES de resetear para la animación
    const targetScaleX = img.scaleX;
    const targetScaleY = img.scaleY;

    if (!fromSave) {
      img.setScale(0);
      this.tweens.add({ targets: img, scaleX: targetScaleX, scaleY: targetScaleY, duration: 450, ease: 'Back.easeOut' });
    }

    const selGfx = this.add.graphics();
    selGfx.lineStyle(3, 0x5c79ff, 0.8);
    selGfx.strokeEllipse(spot.x, spot.y + 80, 220, 60);
    selGfx.setVisible(false);

    const levelTxt = this.add.text(spot.x, spot.y + 68, `Nv.1  ${type.name}`, {
      fontSize: '15px', color: '#c8d0ff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const unclaimedTxt = this.add.text(spot.x, spot.y - 70, '', {
      fontSize: '18px', color: '#f5c518', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    const progressBg  = this.add.rectangle(spot.x, spot.y - 90, 210, 10, 0x1e2844);
    const progressBar = this.add.rectangle(spot.x - 105, spot.y - 90, 1, 8, type.color).setOrigin(0, 0.5);
    let   progValue   = 0;

    const prodTimer = this.time.addEvent({
      delay: bData.productionInterval, loop: true,
      callback: () => {
        bData.unclaimed += bData.coinsPerTick;
        progValue = 0;
        this._floatCoin(spot.x, spot.y, bData.coinsPerTick);
        this._refreshUnclaimed(spotId);
        this.game.events.emit('production-tick');
      },
    });

    const progTimer = this.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        progValue = Math.min(progValue + 50 / bData.productionInterval, 1);
        progressBar.width = Math.max(1, 210 * progValue);
      },
    });

    img.on('pointerdown', () => {
      this._claimCoins(spotId);
      this._selectBuilding(spotId);
    });

    // Hover tooltip hint
    img.on('pointerover', () => {
      this.game.events.emit('status-message',
        `${type.name} Nv.${bData.level} · ${bData.coinsPerTick}🪙/${(bData.productionInterval/1000).toFixed(1)}s`);
    });

    this._objs[spotId] = { img, selGfx, levelTxt, unclaimedTxt, progressBg, progressBar, prodTimer, progTimer };
    if (fromSave) {
      levelTxt.setText(`Nv.${bData.level}  ${type.name}`);
      this._refreshUnclaimed(spotId);
    }

    if (!fromSave) {
      this._createStudents();
      this._missions.onAction('totalBuildings');
      this._doSave();
      this.game.events.emit('building-placed', { spotId, typeId });
      this.game.events.emit('coins-updated');
      this.game.events.emit('status-message', '¡Facultad construida! Haz clic en ella para reclamar monedas.');
    }
  }

  // ── Coins ───────────────────────────────────────────────────

  _claimCoins(spotId) {
    const bData = this._state.placedBuildings[spotId];
    if (!bData || bData.unclaimed <= 0) return;

    const amount = bData.unclaimed;
    bData.unclaimed = 0;
    this._state.coins            += amount;
    this._state.totalCoinsEarned += amount;
    this._state.missions.progress.totalCoinsEarned += amount;

    this._refreshUnclaimed(spotId);
    this._popText(spotId, amount);
    this._missions.onAction('totalCoinsEarned');
    this._doSave();
    this.game.events.emit('coins-updated');
  }

  _refreshUnclaimed(spotId) {
    const bData = this._state.placedBuildings[spotId];
    const objs  = this._objs[spotId];
    if (!bData || !objs) return;
    objs.unclaimedTxt.setText(bData.unclaimed > 0 ? `⏳ ${bData.unclaimed}` : '');
  }

  _popText(spotId, amount) {
    const spot = DROP_SPOTS.find(s => s.id === spotId);
    if (!spot) return;
    const t = this.add.text(spot.x, spot.y - 80, `+${amount} 🪙`, {
      fontSize: '24px', color: '#f5c518', fontFamily: 'Orbitron, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, duration: 1000, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  _floatCoin(x, y, amount) {
    const dx = Phaser.Math.Between(-30, 30);
    const t  = this.add.text(x + dx, y - 130, `+${amount}`, {
      fontSize: '16px', color: '#f5c518', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ── Upgrade ─────────────────────────────────────────────────

  _upgradeBuilding(spotId) {
    const bData = this._state.placedBuildings[spotId];
    if (!bData) return;
    const type = BUILDING_TYPES.find(t => t.id === bData.typeId);
    const cost = type.upgradeBaseCost * bData.level;

    if (this._state.coins < cost) {
      this.game.events.emit('status-message', `Necesitas ${cost} 🪙 para mejorar.`);
      return;
    }

    this._state.coins    -= cost;
    bData.level          += 1;
    bData.coinsPerTick    = Math.ceil(bData.coinsPerTick * 1.6);
    bData.productionInterval = Math.max(200, Math.round(bData.productionInterval * 0.82));
    this._state.totalUpgrades++;

    const objs = this._objs[spotId];
    const spot = DROP_SPOTS.find(s => s.id === spotId);

    objs.prodTimer.remove(false);
    objs.prodTimer = this.time.addEvent({
      delay: bData.productionInterval, loop: true,
      callback: () => {
        bData.unclaimed += bData.coinsPerTick;
        this._floatCoin(spot.x, spot.y, bData.coinsPerTick);
        this._refreshUnclaimed(spotId);
        this.game.events.emit('production-tick');
      },
    });

    objs.levelTxt.setText(`Nv.${bData.level}  ${type.name}`);
    this.tweens.add({ targets: objs.img, alpha: 0.2, duration: 80, yoyo: true, repeat: 4 });

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

  _selectBuilding(spotId) {
    this._selectedSpot = spotId;
    Object.entries(this._objs).forEach(([id, o]) => {
      o.selGfx.setVisible(parseInt(id) === spotId);
    });
    this.game.events.emit('building-selected', {
      spotId,
      bData: this._state.placedBuildings[spotId],
    });
  }

  // ── Students ────────────────────────────────────────────────

  _createStudents() {
    this._students.forEach(s => { if (s?.active) s.destroy(); });
    this._students = [];
    const n = Math.min(6 + Object.keys(this._state.placedBuildings).length * 3, 22);

    for (let i = 0; i < n; i++) {
      const path = STUDENT_PATHS[i % STUDENT_PATHS.length];
      const t    = STUDENT_TYPES[Math.floor(Math.random() * STUDENT_TYPES.length)];
      const idx  = Math.floor(Math.random() * path.length);
      const start = path[idx];

      // Use Graphics to avoid Phaser 4 Arc WebGL bug
      const gfx = this.add.graphics();
      gfx.fillStyle(t.color, 1);
      gfx.fillCircle(0, 0, t.r);
      gfx.setPosition(start.x, start.y);
      gfx._pathData = { path, idx, reverse: Math.random() > 0.5, spd: t.spd };

      this._students.push(gfx);
      this._moveStudent(gfx);
    }
  }

  _moveStudent(dot) {
    if (!dot?.active) return;
    const d = dot._pathData;
    const nextIdx = d.reverse ? d.idx - 1 : d.idx + 1;

    if (nextIdx < 0 || nextIdx >= d.path.length) {
      d.reverse = !d.reverse;
      this._moveStudent(dot);
      return;
    }

    const from = d.path[d.idx];
    const to   = d.path[nextIdx];
    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    d.idx      = nextIdx;

    this.tweens.add({
      targets: dot, x: to.x, y: to.y,
      duration: dist * (d.spd + Phaser.Math.Between(-60, 60)),
      ease: 'Linear',
      onComplete: () => this._moveStudent(dot),
    });
  }

  // ── Campus events ────────────────────────────────────────────

  _spawnEventIcon({ pos, facultyId, data, question }) {
    const container = this.add.container(pos.x, pos.y);

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
      this._events.closeQuiz();
    });

    hit.on('pointerover', () => { ring.clear(); ring.lineStyle(4, 0xffffff, 1); ring.strokeCircle(0, 0, 48); });
    hit.on('pointerout',  () => { ring.clear(); ring.lineStyle(3, data.color, 0.9); ring.strokeCircle(0, 0, 48); });
    hit.on('pointerdown', () => {
      timeout.remove(false);
      container.destroy();
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
      offline += Math.floor((b.coinsPerTick / (b.productionInterval / 1000)) * Math.min(elapsed, 7200));
    });
    if (offline > 0) {
      this._state.coins            += offline;
      this._state.totalCoinsEarned += offline;
      this.game.events.emit('offline-earnings', { amount: offline, seconds: elapsed });
      this.game.events.emit('coins-updated');
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
